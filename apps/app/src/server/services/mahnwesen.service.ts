/**
 * Mahnwesen Service
 * Handles dunning process with late fees and interest calculation
 */

import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { Mahnstufe } from "@prisma/client";

interface MahngebuehrenKonfig {
  ERINNERUNG: number;
  MAHNUNG_1: number;
  MAHNUNG_2: number;
  MAHNUNG_3: number;
}

interface VerzugszinsKonfig {
  jahreszinssatz: number; // z.B. 0.05 für 5% p.a.
}

// Standardkonfiguration (kann später in DB gespeichert werden)
const MAHNGEBUEHREN: MahngebuehrenKonfig = {
  ERINNERUNG: 0,
  MAHNUNG_1: 5,
  MAHNUNG_2: 10,
  MAHNUNG_3: 15,
};

const VERZUGSZINS: VerzugszinsKonfig = {
  jahreszinssatz: 0.05, // 5% p.a.
};

interface ErsteMahnungParams {
  mietverhaeltnisId: string;
  mahnstufe: Mahnstufe;
  tenantId: string;
  userId?: string;
}

/**
 * Berechnet Verzugszinsen für einen Zeitraum
 * Formel: (Betrag * Zinssatz * Tage) / 365
 */
function berechneVerzugszinsen(
  betrag: Decimal,
  vonDatum: Date,
  bisDatum: Date,
  zinssatz: number
): Decimal {
  const tage = Math.ceil(
    (bisDatum.getTime() - vonDatum.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (tage <= 0) {
    return new Decimal(0);
  }

  const zinsen = betrag
    .times(zinssatz)
    .times(tage)
    .dividedBy(365);

  return zinsen;
}

/**
 * Erstellt eine Mahnung für ein Mietverhältnis
 */
export async function ersteMahnung(
  params: ErsteMahnungParams
) {
  const { mietverhaeltnisId, mahnstufe, tenantId } = params;
  // Mietverhältnis abrufen
  const mietverhaeltnis = await db.mietverhaeltnis.findUnique({
    where: { id: mietverhaeltnisId },
    include: {
      mieter: true,
      einheit: {
        include: {
          objekt: true,
        },
      },
    },
  });

  if (!mietverhaeltnis) {
    throw new Error("Mietverhältnis nicht gefunden");
  }

  if (mietverhaeltnis.tenantId !== tenantId) {
    throw new Error("Zugriff verweigert");
  }

  // Offene Sollstellungen sammeln
  const offeneSollstellungen = await db.sollstellung.findMany({
    where: {
      tenantId,
      mietverhaeltnisId,
      status: { in: ["OFFEN", "TEILWEISE_BEZAHLT"] },
    },
    orderBy: { faelligkeitsdatum: "asc" },
  });

  if (offeneSollstellungen.length === 0) {
    throw new Error("Keine offenen Sollstellungen vorhanden");
  }

  // Offenen Betrag berechnen
  const offenerBetrag = offeneSollstellungen.reduce((sum, soll) => {
    const offen = new Decimal(soll.betragGesamt.toString()).minus(
      soll.gedecktGesamt.toString()
    );
    return sum.plus(offen);
  }, new Decimal(0));

  if (offenerBetrag.lessThanOrEqualTo(0)) {
    throw new Error("Kein offener Betrag vorhanden");
  }

  // Tenant-Konfiguration laden (Mahngebühren + Verzugszins)
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      mahngebuehrErinnerung: true,
      mahngebuehrStufe1: true,
      mahngebuehrStufe2: true,
      mahngebuehrStufe3: true,
      verzugszinssatz: true,
    },
  });

  const tenantGebuehren: MahngebuehrenKonfig = tenant
    ? {
        ERINNERUNG: Number(tenant.mahngebuehrErinnerung),
        MAHNUNG_1: Number(tenant.mahngebuehrStufe1),
        MAHNUNG_2: Number(tenant.mahngebuehrStufe2),
        MAHNUNG_3: Number(tenant.mahngebuehrStufe3),
      }
    : MAHNGEBUEHREN;

  // verzugszinssatz is stored as percentage (e.g. 5 = 5%), convert to decimal
  const jahreszinssatz = tenant
    ? Number(tenant.verzugszinssatz) / 100
    : VERZUGSZINS.jahreszinssatz;

  // Mahngebühr
  const mahngebuehr = new Decimal(tenantGebuehren[mahnstufe]);

  // Verzugszinsen berechnen
  const mahnDatum = new Date();
  let verzugszinsenGesamt = new Decimal(0);

  for (const soll of offeneSollstellungen) {
    const offen = new Decimal(soll.betragGesamt.toString()).minus(
      soll.gedecktGesamt.toString()
    );

    if (offen.greaterThan(0)) {
      // Verzugstart = Fälligkeitsdatum + 1 Tag
      const verzugstart = new Date(soll.faelligkeitsdatum);
      verzugstart.setDate(verzugstart.getDate() + 1);

      // Nur wenn bereits im Verzug
      if (verzugstart < mahnDatum) {
        const zinsen = berechneVerzugszinsen(
          offen,
          verzugstart,
          mahnDatum,
          jahreszinssatz
        );
        verzugszinsenGesamt = verzugszinsenGesamt.plus(zinsen);
      }
    }
  }

  // Mahngebühr-Sollstellung erstellen (falls > 0)
  let mahngebuehrPostenId: string | undefined;
  if (mahngebuehr.greaterThan(0)) {
    const mahngebuehrPosten = await db.sollstellung.create({
      data: {
        tenantId,
        mietverhaeltnisId,
        typ: "MAHNGEBUEHR",
        titel: `Mahngebühr ${mahnstufe} - ${mietverhaeltnis.einheit.objekt.bezeichnung} ${mietverhaeltnis.einheit.einheitNr}`,
        betragGesamt: mahngebuehr,
        faelligkeitsdatum: mahnDatum,
        status: "OFFEN",
      },
    });
    mahngebuehrPostenId = mahngebuehrPosten.id;
  }

  // Verzugszinsen-Sollstellung erstellen (falls > 0)
  let verzugszinsenPostenId: string | undefined;
  if (verzugszinsenGesamt.greaterThan(0)) {
    const verzugszinsenPosten = await db.sollstellung.create({
      data: {
        tenantId,
        mietverhaeltnisId,
        typ: "VERZUGSZINSEN",
        titel: `Verzugszinsen bis ${mahnDatum.toLocaleDateString("de-DE")} - ${mietverhaeltnis.einheit.objekt.bezeichnung} ${mietverhaeltnis.einheit.einheitNr}`,
        betragGesamt: verzugszinsenGesamt,
        faelligkeitsdatum: mahnDatum,
        status: "OFFEN",
      },
    });
    verzugszinsenPostenId = verzugszinsenPosten.id;
  }

  // Mahnung erstellen
  const mahnung = await db.mahnung.create({
    data: {
      tenantId,
      mietverhaeltnisId,
      mahnstufe,
      mahnDatum,
      offenerBetrag,
      mahngebuehr,
      verzugszinsen: verzugszinsenGesamt,
      mahngebuehrPostenId,
      verzugszinsenPostenId,
      status: "OFFEN",
      dokumentGeneriert: false,
    },
  });

  return mahnung;
}

/**
 * Ermittelt Mahnvorschläge für alle Mietverhältnisse
 * Logik:
 * - Überfällig > 7 Tage → ERINNERUNG
 * - Überfällig > 14 Tage + keine Mahnung → MAHNUNG_1
 * - Überfällig > 28 Tage + MAHNUNG_1 existiert → MAHNUNG_2
 * - Überfällig > 42 Tage + MAHNUNG_2 existiert → MAHNUNG_3
 */
export async function ermittleMahnvorschlaege(tenantId: string) {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);

  // Alle aktiven, nicht gesperrten Mietverhältnisse mit offenen Sollstellungen
  const mietverhaeltnisse = await db.mietverhaeltnis.findMany({
    where: {
      tenantId,
      auszugsdatum: null, // Nur aktive
      mahnungGesperrt: false,
    },
    include: {
      mieter: true,
      einheit: {
        include: {
          objekt: true,
        },
      },
      sollstellungen: {
        where: {
          status: { in: ["OFFEN", "TEILWEISE_BEZAHLT"] },
        },
        orderBy: { faelligkeitsdatum: "asc" },
      },
      // Bestehende Mahnungen abrufen
      // TODO: Requires Mahnung → Mietverhaeltnis relation
    },
  });

  const vorschlaege = [];

  for (const mv of mietverhaeltnisse) {
    // Zusätzlich prüfen: temporäre Sperre noch aktiv?
    if (mv.mahnungGesperrtBis && mv.mahnungGesperrtBis > heute) {
      continue;
    }

    if (mv.sollstellungen.length === 0) {
      continue;
    }

    // Älteste überfällige Sollstellung
    const aeltesteSoll = mv.sollstellungen[0];
    const faellig = new Date(aeltesteSoll.faelligkeitsdatum);
    faellig.setHours(0, 0, 0, 0);

    const tageUeberfaellig = Math.floor(
      (heute.getTime() - faellig.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (tageUeberfaellig <= 7) {
      continue; // Noch nicht mahnrelevant
    }

    // Letzte Mahnung abrufen
    const letzteMahnung = await db.mahnung.findFirst({
      where: {
        tenantId,
        mietverhaeltnisId: mv.id,
      },
      orderBy: { mahnDatum: "desc" },
    });

    let empfohleneStufe: Mahnstufe;

    if (!letzteMahnung) {
      // Keine Mahnung vorhanden
      if (tageUeberfaellig >= 14) {
        empfohleneStufe = "MAHNUNG_1";
      } else {
        empfohleneStufe = "ERINNERUNG";
      }
    } else {
      // Mahnung vorhanden, Eskalation prüfen
      if (letzteMahnung.mahnstufe === "ERINNERUNG" && tageUeberfaellig >= 14) {
        empfohleneStufe = "MAHNUNG_1";
      } else if (
        letzteMahnung.mahnstufe === "MAHNUNG_1" &&
        tageUeberfaellig >= 28
      ) {
        empfohleneStufe = "MAHNUNG_2";
      } else if (
        letzteMahnung.mahnstufe === "MAHNUNG_2" &&
        tageUeberfaellig >= 42
      ) {
        empfohleneStufe = "MAHNUNG_3";
      } else {
        continue; // Noch keine Eskalation nötig
      }
    }

    // Offenen Betrag berechnen
    const offenerBetrag = mv.sollstellungen.reduce((sum, soll) => {
      const offen = new Decimal(soll.betragGesamt.toString()).minus(
        soll.gedecktGesamt.toString()
      );
      return sum.plus(offen);
    }, new Decimal(0));

    vorschlaege.push({
      mietverhaeltnisId: mv.id,
      mieter: mv.mieter,
      einheit: mv.einheit,
      objekt: mv.einheit.objekt,
      offenerBetrag: offenerBetrag.toNumber(),
      tageUeberfaellig,
      empfohleneStufe,
      letzteMahnung,
      offeneSollstellungen: mv.sollstellungen,
    });
  }

  return vorschlaege;
}
