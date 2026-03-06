import { db } from "@/lib/db";
import {
  ermittleMahnvorschlaege,
  ersteMahnung,
} from "@/server/services/mahnwesen.service";

export async function GET(request: Request) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Load all tenants with auto-mahnung active
    const tenants = await db.tenant.findMany({
      where: { autoMahnungAktiv: true },
    });

    let totalMahnungen = 0;

    for (const tenant of tenants) {
      try {
        const vorschlaege = await ermittleMahnvorschlaege(tenant.id);

        for (const vorschlag of vorschlaege) {
          // Check if a Mahnung already exists for this Mietverhaeltnis in last 30 days
          const existingMahnung = await db.mahnung.findFirst({
            where: {
              tenantId: tenant.id,
              mietverhaeltnisId: vorschlag.mietverhaeltnisId,
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          });

          if (
            !existingMahnung &&
            vorschlag.tageUeberfaellig >=
              tenant.autoMahnungTageNachFaelligkeit
          ) {
            await ersteMahnung({
              mietverhaeltnisId: vorschlag.mietverhaeltnisId,
              mahnstufe: vorschlag.empfohleneStufe,
              tenantId: tenant.id,
            });
            totalMahnungen++;
          }
        }
      } catch (err) {
        console.error(`Error processing tenant ${tenant.id}:`, err);
      }
    }

    return Response.json({
      ok: true,
      processed: tenants.length,
      mahnungenErstellt: totalMahnungen,
    });
  } catch (err) {
    console.error("Cron error:", err);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
