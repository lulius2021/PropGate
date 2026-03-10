/**
 * E-Mail Service (Resend)
 * Sendet E-Mails für Mahnungen und Wartungserinnerungen
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@propgate.de";

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY nicht gesetzt — E-Mail nicht gesendet");
    return { success: false, error: "RESEND_API_KEY nicht konfiguriert" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function sendMahnungEmail(
  mahnungId: string,
  tenantId: string,
  mieterEmail: string,
  mieterName: string,
  mahnstufe: string,
  offenerBetrag: string,
  objekt: string,
  einheit: string,
): Promise<EmailResult> {
  const stufeLabel: Record<string, string> = {
    ERINNERUNG: "Zahlungserinnerung",
    MAHNUNG_1: "1. Mahnung",
    MAHNUNG_2: "2. Mahnung",
    MAHNUNG_3: "3. und letzte Mahnung",
  };

  const subject = `${stufeLabel[mahnstufe] || mahnstufe} — ${objekt} ${einheit}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>${stufeLabel[mahnstufe] || mahnstufe}</h2>
      <p>Sehr geehrte/r ${mieterName},</p>
      <p>wir möchten Sie darauf aufmerksam machen, dass für Ihr Mietverhältnis (${objekt}, ${einheit})
      noch ein offener Betrag von <strong>${offenerBetrag} €</strong> aussteht.</p>
      <p>Bitte überweisen Sie den ausstehenden Betrag schnellstmöglich auf unser Konto.</p>
      <p>Bei Fragen wenden Sie sich gerne an uns.</p>
      <p>Mit freundlichen Grüßen<br>Ihre Hausverwaltung</p>
    </div>
  `;

  return sendEmail(mieterEmail, subject, html);
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<EmailResult> {
  const subject = "Passwort zurücksetzen — PropGate";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Passwort zurücksetzen</h2>
      <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
      <p>Klicken Sie auf den folgenden Link, um ein neues Passwort festzulegen. Der Link ist <strong>1 Stunde</strong> gültig.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background-color: #0066ff; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Passwort zurücksetzen
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>
    </div>
  `;
  return sendEmail(to, subject, html);
}

export async function sendWartungserinnerung(
  aufgabeId: string,
  bezeichnung: string,
  faelligkeitsdatum: Date,
  verantwortlicherEmail: string,
): Promise<EmailResult> {
  const subject = `Wartungserinnerung: ${bezeichnung}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Wartungserinnerung</h2>
      <p>Die folgende Wartungsaufgabe ist fällig:</p>
      <p><strong>${bezeichnung}</strong></p>
      <p>Fälligkeitsdatum: ${faelligkeitsdatum.toLocaleDateString("de-DE")}</p>
      <p>Bitte planen Sie die Durchführung entsprechend.</p>
    </div>
  `;

  return sendEmail(verantwortlicherEmail, subject, html);
}
