/**
 * CloudFlare R2 Client (S3-Compatible)
 *
 * Verwendung für:
 * - Dokument-Uploads (Mietverträge, Mahnungen, Rechnungen)
 * - Zähler-Fotos
 * - Sonstige Dateien
 *
 * Setup-Anleitung:
 * 1. CloudFlare R2 Bucket erstellen
 * 2. API-Token mit R2-Rechten generieren
 * 3. Env Vars in Vercel/lokal setzen
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Lazy-init: R2 env vars are validated at runtime, not build time
function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('R2 environment variables are not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)');
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName };
}

let _r2Client: S3Client | null = null;

function getR2Client() {
  if (!_r2Client) {
    const config = getR2Config();
    _r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return _r2Client;
}

function getBucketName() {
  return getR2Config().bucketName;
}

/**
 * Upload-Datei zu R2
 *
 * @param key - S3 Key (z.B. "tenantId/dokumente/mietvertrag-123.pdf")
 * @param buffer - File Buffer
 * @param contentType - MIME Type (z.B. "application/pdf")
 * @returns S3 Key
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await getR2Client().send(command);
  return key;
}

/**
 * Download-Datei von R2 (als Buffer)
 *
 * @param key - S3 Key
 * @returns File Buffer
 */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  const response = await getR2Client().send(command);

  if (!response.Body) {
    throw new Error('No file body returned');
  }

  // Stream zu Buffer konvertieren
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Generiere Signed URL (für direkten Download/Ansicht)
 *
 * @param key - S3 Key
 * @param expiresIn - Gültigkeit in Sekunden (default: 1 Stunde)
 * @returns Signed URL
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return await getSignedUrl(getR2Client(), command, { expiresIn });
}

/**
 * Generiere Signed Upload URL (für direkten Upload vom Client)
 *
 * @param key - S3 Key
 * @param contentType - MIME Type
 * @param expiresIn - Gültigkeit in Sekunden (default: 10 Minuten)
 * @returns Signed Upload URL
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(getR2Client(), command, { expiresIn });
}

/**
 * Lösche Datei von R2
 *
 * @param key - S3 Key
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  await getR2Client().send(command);
}

/**
 * Generiere eindeutigen S3-Key für Upload
 *
 * @param tenantId - Tenant ID
 * @param kategorie - Kategorie (z.B. "dokumente", "zaehler")
 * @param filename - Original-Dateiname
 * @returns S3 Key
 */
export function generateR2Key(
  tenantId: string,
  kategorie: 'dokumente' | 'zaehler' | 'sonstiges',
  filename: string
): string {
  // Timestamp + Random für Eindeutigkeit
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  // Dateiendung extrahieren
  const ext = filename.split('.').pop() || 'bin';

  // Dateiname sanitizen (nur alphanumerisch + Bindestrich)
  const safeName = filename
    .replace(/\.[^/.]+$/, '') // Extension entfernen
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .toLowerCase()
    .substring(0, 50); // Max 50 Zeichen

  return `${tenantId}/${kategorie}/${safeName}-${timestamp}-${random}.${ext}`;
}

/**
 * Helper: Prüfe ob MIME Type erlaubt ist
 *
 * Erlaubte Typen:
 * - PDF: application/pdf
 * - Word: application/vnd.openxmlformats-officedocument.wordprocessingml.document
 * - Excel: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 * - Bilder: image/jpeg, image/png, image/webp
 * - CSV: text/csv
 */
export function isAllowedMimeType(mimeType: string): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
  ];

  return allowedTypes.includes(mimeType);
}

/**
 * Helper: Maximale Dateigröße (10 MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Helper: Validiere Upload
 */
export function validateUpload(file: {
  size: number;
  type: string;
}): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Datei zu groß (max. ${MAX_FILE_SIZE / 1024 / 1024} MB)`,
    };
  }

  if (!isAllowedMimeType(file.type)) {
    return {
      valid: false,
      error: 'Dateityp nicht erlaubt (nur PDF, Word, Excel, Bilder, CSV)',
    };
  }

  return { valid: true };
}
