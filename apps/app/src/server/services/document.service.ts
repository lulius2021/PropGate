/**
 * Document Generation Service
 * Generates PDF and DOCX documents from Handlebars templates
 */

import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import { Document, Packer, Paragraph, TextRun } from "docx";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

export type TemplateType =
  | "mahnung-erinnerung"
  | "mahnung-1"
  | "mahnung-2"
  | "mahnung-3"
  | "mietvertrag-wohnraum"
  | "mietvertrag-gewerbe";

interface GeneratePDFParams {
  templateType: TemplateType;
  data: Record<string, unknown>;
  tenantId: string;
}

interface GenerateDOCXParams {
  templateType: TemplateType;
  data: Record<string, unknown>;
  tenantId: string;
}

/**
 * Lädt ein Handlebars-Template
 */
async function loadTemplate(templateType: TemplateType): Promise<string> {
  const templatePath = path.join(
    process.cwd(),
    "src",
    "templates",
    `${templateType}.hbs`
  );

  try {
    const templateContent = await fs.readFile(templatePath, "utf-8");
    return templateContent;
  } catch (error) {
    throw new Error(
      `Template ${templateType} nicht gefunden: ${(error as Error).message}`
    );
  }
}

/**
 * Registriert Handlebars-Helpers
 */
function registerHelpers() {
  // Date Formatter
  Handlebars.registerHelper("formatDate", (date: Date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  });

  // Currency Formatter
  Handlebars.registerHelper("formatCurrency", (amount: number) => {
    if (amount === undefined || amount === null) return "0,00 €";
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  });

  // Decimal Formatter
  Handlebars.registerHelper("formatDecimal", (value: unknown) => {
    if (value === undefined || value === null) return "0,00";
    const num = typeof value === "number" ? value : parseFloat(String(value));
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  });
}

/**
 * Generiert ein PDF-Dokument
 */
export async function generierePDF(
  params: GeneratePDFParams
): Promise<Buffer> {
  const { templateType, data } = params;
  // Helpers registrieren
  registerHelpers();

  // Template laden
  const templateSource = await loadTemplate(templateType);
  const template = Handlebars.compile(templateSource);

  // HTML generieren
  const html = template(data);

  // PDF mit Puppeteer generieren
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Generiert ein DOCX-Dokument (vereinfachte Version)
 * Für komplexe Layouts sollte ein Template-System wie docx-templates verwendet werden
 */
export async function generiereDOCX(
  params: GenerateDOCXParams
): Promise<Buffer> {
  const { templateType } = params;
  // Vereinfachte DOCX-Generierung
  // Für Produktionseinsatz sollte ein Template-basierter Ansatz verwendet werden

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `Dokument: ${templateType}`,
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generiert am: ${new Date().toLocaleDateString("de-DE")}`,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "\nHinweis: Dies ist eine vereinfachte DOCX-Generierung.",
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Für vollständige Layouts verwenden Sie bitte das PDF-Format.",
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * Speichert ein generiertes Dokument in der Datenbank
 * Hinweis: Für CloudFlare R2 Upload muss noch die Upload-Logik hinzugefügt werden
 */
export async function speichereDokument({
  buffer,
  dateiname,
  mimeType,
  typ,
  tenantId,
  objektId,
  einheitId,
  mieterId,
  mietverhaeltnisId,
  mahnungId,
}: {
  buffer: Buffer;
  dateiname: string;
  mimeType: string;
  typ: "MIETVERTRAG" | "MAHNUNG" | "RECHNUNG" | "ZAEHLERABLESUNG" | "SONSTIGES";
  tenantId: string;
  objektId?: string;
  einheitId?: string;
  mieterId?: string;
  mietverhaeltnisId?: string;
  mahnungId?: string;
}) {
  // TODO: CloudFlare R2 Upload implementieren
  // Aktuell: Platzhalter-S3-Key
  const s3Key = `${tenantId}/${Date.now()}-${dateiname}`;

  const dokument = await db.dokument.create({
    data: {
      tenantId,
      typ,
      dateiname,
      s3Key,
      mimeType,
      groesse: buffer.length,
      objektId,
      einheitId,
      mieterId,
      mietverhaeltnisId,
      mahnungId,
    },
  });

  return dokument;
}

/**
 * Generiert und speichert ein Mahnungsdokument
 */
export async function generiereUndSpeichereMahnung(
  mahnungId: string,
  tenantId: string
) {
  const mahnung = await db.mahnung.findUnique({
    where: { id: mahnungId, tenantId },
    include: {
      tenant: true,
    },
  });

  if (!mahnung) {
    throw new Error("Mahnung nicht gefunden");
  }

  // Mietverhältnis mit Details laden
  const mietverhaeltnis = await db.mietverhaeltnis.findUnique({
    where: { id: mahnung.mietverhaeltnisId },
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

  // Offene Sollstellungen laden
  const sollstellungen = await db.sollstellung.findMany({
    where: {
      tenantId,
      mietverhaeltnisId: mahnung.mietverhaeltnisId,
      status: { in: ["OFFEN", "TEILWEISE_BEZAHLT"] },
    },
    orderBy: { faelligkeitsdatum: "asc" },
  });

  // Template-Typ bestimmen
  let templateType: TemplateType;
  switch (mahnung.mahnstufe) {
    case "ERINNERUNG":
      templateType = "mahnung-erinnerung";
      break;
    case "MAHNUNG_1":
      templateType = "mahnung-1";
      break;
    case "MAHNUNG_2":
      templateType = "mahnung-2";
      break;
    case "MAHNUNG_3":
      templateType = "mahnung-3";
      break;
  }

  // Template-Daten vorbereiten
  const templateData = {
    mahnung: {
      ...mahnung,
      mahnDatum: mahnung.mahnDatum,
      offenerBetrag: mahnung.offenerBetrag.toNumber(),
      mahngebuehr: mahnung.mahngebuehr.toNumber(),
      verzugszinsen: mahnung.verzugszinsen.toNumber(),
    },
    mieter: mietverhaeltnis.mieter,
    einheit: mietverhaeltnis.einheit,
    objekt: mietverhaeltnis.einheit.objekt,
    tenant: mahnung.tenant,
    sollstellungen: sollstellungen.map((s) => ({
      ...s,
      betragGesamt: s.betragGesamt.toNumber(),
      gedecktGesamt: s.gedecktGesamt.toNumber(),
      offen:
        s.betragGesamt.toNumber() - s.gedecktGesamt.toNumber(),
    })),
    gesamt: {
      offenerBetrag: mahnung.offenerBetrag.toNumber(),
      mahngebuehr: mahnung.mahngebuehr.toNumber(),
      verzugszinsen: mahnung.verzugszinsen.toNumber(),
      gesamt:
        mahnung.offenerBetrag.toNumber() +
        mahnung.mahngebuehr.toNumber() +
        mahnung.verzugszinsen.toNumber(),
    },
  };

  // PDF generieren
  const pdfBuffer = await generierePDF({
    templateType,
    data: templateData,
    tenantId,
  });

  // Dokument speichern
  const dateiname = `${mahnung.mahnstufe}_${mietverhaeltnis.mieter.nachname}_${new Date().toISOString().split("T")[0]}.pdf`;

  const dokument = await speichereDokument({
    buffer: pdfBuffer,
    dateiname,
    mimeType: "application/pdf",
    typ: "MAHNUNG",
    tenantId,
    mietverhaeltnisId: mahnung.mietverhaeltnisId,
    mahnungId: mahnung.id,
  });

  // Mahnung aktualisieren
  await db.mahnung.update({
    where: { id: mahnungId },
    data: { dokumentGeneriert: true },
  });

  return { dokument, pdfBuffer };
}
