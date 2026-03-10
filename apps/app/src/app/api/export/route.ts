import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hole User mit Rolle und tenantId
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { tenantId: true, role: true },
    });

    if (!user?.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // Nur ADMIN darf exportieren
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Nur Administratoren können Daten exportieren' },
        { status: 403 }
      );
    }

    const tenantId = user.tenantId;

    // Exportiere ALLE Daten des Mandanten
    const exportData = {
      exportedAt: new Date().toISOString(),
      tenant: await db.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, createdAt: true },
      }),
      objekte: await db.objekt.findMany({
        where: { tenantId },
        include: {
          einheiten: true,
        },
      }),
      einheiten: await db.einheit.findMany({
        where: { tenantId },
        include: {
          statusHistorie: true,
        },
      }),
      mieter: await db.mieter.findMany({
        where: { tenantId },
      }),
      mietverhaeltnisse: await db.mietverhaeltnis.findMany({
        where: { tenantId },
      }),
      sollstellungen: await db.sollstellung.findMany({
        where: { tenantId },
      }),
      zahlungen: await db.zahlung.findMany({
        where: { tenantId },
      }),
      mahnungen: await db.mahnung.findMany({
        where: { tenantId },
      }),
      tickets: await db.ticket.findMany({
        where: { tenantId },
        include: {
          kommentare: true,
        },
      }),
      kosten: await db.kosten.findMany({
        where: { tenantId },
        include: {
          zahlungen: true,
        },
      }),
      zaehler: await db.zaehler.findMany({
        where: { tenantId },
        include: {
          ablesungen: true,
        },
      }),
      kredite: await db.kredit.findMany({
        where: { tenantId },
        include: {
          sondertilgungen: true,
        },
      }),
      dokumente: await db.dokument.findMany({
        where: { tenantId },
        select: {
          id: true,
          dateiname: true,
          mimeType: true,
          groesse: true,
          s3Key: true,
          typ: true,
          objektId: true,
          einheitId: true,
          mieterId: true,
          mietverhaeltnisId: true,
          notiz: true,
          version: true,
          vorgaengerId: true,
          faelligkeitsdatum: true,
          fristTyp: true,
          schlagworte: true,
          hochgeladenAm: true,
        },
      }),
      auditLogs: await db.auditLog.findMany({
        where: { tenantId },
        orderBy: { timestamp: 'desc' },
        take: 1000, // Nur letzte 1000 Logs
      }),
    };

    // Als JSON zurückgeben (Download)
    const filename = `propertyos-export-${tenantId}-${Date.now()}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
