import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const seedingRouter = router({
  createDemoData: adminProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    // Guard: only if DB is empty
    const objekteCount = await ctx.db.objekt.count({ where: { tenantId } });
    if (objekteCount > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Bereits Daten vorhanden. Demo-Daten können nur eingefügt werden wenn die Datenbank leer ist.",
      });
    }

    // Create 3 Objekte
    const objekt1 = await ctx.db.objekt.create({
      data: {
        tenantId,
        bezeichnung: "Mehrfamilienhaus Musterstraße",
        strasse: "Musterstraße 12",
        plz: "10115",
        ort: "Berlin",
        objektart: "MFH",
        baujahr: 1985,
        wohnflaeche: 450.0,
      },
    });
    const objekt2 = await ctx.db.objekt.create({
      data: {
        tenantId,
        bezeichnung: "Wohnhaus Parkweg",
        strasse: "Parkweg 5",
        plz: "20095",
        ort: "Hamburg",
        objektart: "WOHNHAUS",
        baujahr: 2003,
        wohnflaeche: 120.0,
      },
    });
    const objekt3 = await ctx.db.objekt.create({
      data: {
        tenantId,
        bezeichnung: "Gewerbeimmobilie Hauptstraße",
        strasse: "Hauptstraße 100",
        plz: "80331",
        ort: "München",
        objektart: "GEWERBE",
        baujahr: 1998,
        gewerbeflaeche: 200.0,
      },
    });

    // Create 8 Einheiten
    const e1 = await ctx.db.einheit.create({
      data: {
        tenantId,
        objektId: objekt1.id,
        einheitNr: "EG-Links",
        typ: "WOHNUNG",
        flaeche: 75.0,
        zimmer: 3,
        status: "VERMIETET",
      },
    });
    const e2 = await ctx.db.einheit.create({
      data: {
        tenantId,
        objektId: objekt1.id,
        einheitNr: "EG-Rechts",
        typ: "WOHNUNG",
        flaeche: 80.0,
        zimmer: 3,
        status: "VERMIETET",
      },
    });
    const e3 = await ctx.db.einheit.create({
      data: {
        tenantId,
        objektId: objekt1.id,
        einheitNr: "OG1-Links",
        typ: "WOHNUNG",
        flaeche: 65.0,
        zimmer: 2,
        status: "VERMIETET",
      },
    });
    const e4 = await ctx.db.einheit.create({
      data: {
        tenantId,
        objektId: objekt1.id,
        einheitNr: "OG1-Rechts",
        typ: "WOHNUNG",
        flaeche: 90.0,
        zimmer: 4,
        status: "VERFUEGBAR",
      },
    });
    const e5 = await ctx.db.einheit.create({
      data: {
        tenantId,
        objektId: objekt2.id,
        einheitNr: "Haus",
        typ: "WOHNUNG",
        flaeche: 120.0,
        zimmer: 5,
        status: "VERMIETET",
      },
    });
    const e6 = await ctx.db.einheit.create({
      data: {
        tenantId,
        objektId: objekt2.id,
        einheitNr: "Garage",
        typ: "STELLPLATZ",
        flaeche: 18.0,
        status: "VERMIETET",
      },
    });
    const e7 = await ctx.db.einheit.create({
      data: {
        tenantId,
        objektId: objekt3.id,
        einheitNr: "EG-Büro",
        typ: "GEWERBE",
        flaeche: 120.0,
        status: "VERMIETET",
      },
    });
    const e8 = await ctx.db.einheit.create({
      data: {
        tenantId,
        objektId: objekt3.id,
        einheitNr: "OG-Lager",
        typ: "LAGER",
        flaeche: 80.0,
        status: "VERFUEGBAR",
      },
    });

    // Create 5 Mieter
    const m1 = await ctx.db.mieter.create({
      data: {
        tenantId,
        nachname: "Müller",
        vorname: "Thomas",
        email: "t.mueller@email.de",
        telefonMobil: "0151-11223344",
      },
    });
    const m2 = await ctx.db.mieter.create({
      data: {
        tenantId,
        nachname: "Schmidt",
        vorname: "Anna",
        email: "a.schmidt@email.de",
        telefonMobil: "0152-22334455",
      },
    });
    const m3 = await ctx.db.mieter.create({
      data: {
        tenantId,
        nachname: "Weber",
        vorname: "Klaus",
        email: "k.weber@email.de",
        telefonMobil: "0153-33445566",
      },
    });
    const m4 = await ctx.db.mieter.create({
      data: {
        tenantId,
        nachname: "Fischer",
        vorname: "Maria",
        email: "m.fischer@email.de",
        telefonMobil: "0154-44556677",
      },
    });
    const m5 = await ctx.db.mieter.create({
      data: {
        tenantId,
        typ: "GEWERBE",
        nachname: "GmbH Demo",
        firma: "Demo GmbH",
        email: "info@demo-gmbh.de",
      },
    });

    // Create Mietverhältnisse
    const mv1 = await ctx.db.mietverhaeltnis.create({
      data: {
        tenantId,
        mieterId: m1.id,
        einheitId: e1.id,
        einzugsdatum: new Date("2022-01-01"),
        kaltmiete: 850,
        bkVorauszahlung: 150,
        hkVorauszahlung: 80,
        vertragStatus: "AKTIV",
      },
    });
    const mv2 = await ctx.db.mietverhaeltnis.create({
      data: {
        tenantId,
        mieterId: m2.id,
        einheitId: e2.id,
        einzugsdatum: new Date("2021-07-01"),
        kaltmiete: 920,
        bkVorauszahlung: 160,
        hkVorauszahlung: 90,
        vertragStatus: "AKTIV",
      },
    });
    const mv3 = await ctx.db.mietverhaeltnis.create({
      data: {
        tenantId,
        mieterId: m3.id,
        einheitId: e3.id,
        einzugsdatum: new Date("2023-03-01"),
        kaltmiete: 750,
        bkVorauszahlung: 130,
        hkVorauszahlung: 70,
        vertragStatus: "AKTIV",
      },
    });
    const mv4 = await ctx.db.mietverhaeltnis.create({
      data: {
        tenantId,
        mieterId: m4.id,
        einheitId: e5.id,
        einzugsdatum: new Date("2020-05-01"),
        kaltmiete: 1400,
        bkVorauszahlung: 200,
        hkVorauszahlung: 120,
        vertragStatus: "AKTIV",
      },
    });
    const mv5 = await ctx.db.mietverhaeltnis.create({
      data: {
        tenantId,
        mieterId: m5.id,
        einheitId: e7.id,
        einzugsdatum: new Date("2019-01-01"),
        kaltmiete: 2200,
        bkVorauszahlung: 300,
        hkVorauszahlung: 0,
        vertragStatus: "AKTIV",
      },
    });

    // Create Sollstellungen (some paid, some open)
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 3);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 3);

    // Paid sollstellungen
    await ctx.db.sollstellung.create({
      data: {
        tenantId,
        mietverhaeltnisId: mv1.id,
        typ: "WARMMIETE",
        titel: "Warmmiete Februar",
        betragGesamt: 1080,
        gedecktGesamt: 1080,
        faelligkeitsdatum: twoMonthsAgo,
        status: "BEZAHLT",
      },
    });
    await ctx.db.sollstellung.create({
      data: {
        tenantId,
        mietverhaeltnisId: mv2.id,
        typ: "WARMMIETE",
        titel: "Warmmiete Februar",
        betragGesamt: 1170,
        gedecktGesamt: 1170,
        faelligkeitsdatum: twoMonthsAgo,
        status: "BEZAHLT",
      },
    });

    // Open sollstellungen (overdue — for mahnung demo)
    await ctx.db.sollstellung.create({
      data: {
        tenantId,
        mietverhaeltnisId: mv3.id,
        typ: "WARMMIETE",
        titel: "Warmmiete letzer Monat",
        betragGesamt: 950,
        gedecktGesamt: 0,
        faelligkeitsdatum: lastMonth,
        status: "OFFEN",
      },
    });
    await ctx.db.sollstellung.create({
      data: {
        tenantId,
        mietverhaeltnisId: mv4.id,
        typ: "WARMMIETE",
        titel: "Warmmiete letzer Monat",
        betragGesamt: 1720,
        gedecktGesamt: 800,
        faelligkeitsdatum: lastMonth,
        status: "TEILWEISE_BEZAHLT",
      },
    });

    // Current month sollstellungen
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 3);
    await ctx.db.sollstellung.create({
      data: {
        tenantId,
        mietverhaeltnisId: mv1.id,
        typ: "WARMMIETE",
        titel: "Warmmiete aktueller Monat",
        betragGesamt: 1080,
        gedecktGesamt: 0,
        faelligkeitsdatum: thisMonth,
        status: "OFFEN",
      },
    });
    await ctx.db.sollstellung.create({
      data: {
        tenantId,
        mietverhaeltnisId: mv5.id,
        typ: "WARMMIETE",
        titel: "Gewerbemiete aktueller Monat",
        betragGesamt: 2500,
        gedecktGesamt: 2500,
        faelligkeitsdatum: thisMonth,
        status: "BEZAHLT",
      },
    });

    // Create 2 Tickets
    await ctx.db.ticket.create({
      data: {
        tenantId,
        titel: "Heizungsausfall OG1-Links",
        beschreibung:
          "Die Heizung funktioniert nicht mehr. Bitte um schnelle Reparatur.",
        kategorie: "SCHADENSMELDUNG",
        prioritaet: "HOCH",
        status: "ERFASST",
        objektId: objekt1.id,
        einheitId: e3.id,
      },
    });
    await ctx.db.ticket.create({
      data: {
        tenantId,
        titel: "Briefkasten defekt",
        beschreibung: "Der Briefkasten schließt nicht mehr richtig.",
        kategorie: "WARTUNG",
        prioritaet: "NIEDRIG",
        status: "IN_BEARBEITUNG",
        objektId: objekt1.id,
      },
    });

    // Create 1 Mahnung
    await ctx.db.mahnung.create({
      data: {
        tenantId,
        mietverhaeltnisId: mv3.id,
        mahnstufe: "MAHNUNG_1",
        mahnDatum: new Date(),
        offenerBetrag: 950,
        mahngebuehr: 5,
        verzugszinsen: 1.3,
        status: "OFFEN",
      },
    });

    return {
      objekte: 3,
      einheiten: 8,
      mieter: 5,
      mietverhaeltnisse: 5,
      sollstellungen: 6,
      tickets: 2,
      mahnungen: 1,
    };
  }),
});
