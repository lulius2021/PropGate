import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLAN_LIMITS, type PlanName } from "@/lib/plan-config";

const VALID_PLANS: PlanName[] = ["starter", "plus", "pro", "unlimited"];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const user = session.user as any;
    const { plan, billing } = await req.json();

    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: "Ungültiger Plan" }, { status: 400 });
    }

    const billingInterval = billing === "annual" ? "annual" : "monthly";

    if (!process.env.STRIPE_SECRET_KEY) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Zahlungssystem nicht konfiguriert" }, { status: 503 });
      }
      // Development-only fallback
      await db.tenant.update({
        where: { id: user.tenantId },
        data: { plan, billingInterval, trialEndsAt: null },
      });
      return NextResponse.json({ success: true });
    }

    const { stripe } = await import("@/lib/stripe");

    const planConfig = PLAN_LIMITS[plan as PlanName];
    const priceId =
      billingInterval === "annual"
        ? planConfig.stripePriceIdAnnual
        : planConfig.stripePriceIdMonthly;

    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe Price ID nicht konfiguriert." },
        { status: 500 }
      );
    }

    // Load existing tenant
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant nicht gefunden" }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: tenant.name,
        metadata: { tenantId: tenant.id },
      });
      customerId = customer.id;
      await db.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Cancel existing subscription if present
    if (tenant.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(tenant.stripeSubscriptionId);
    }

    // Create new subscription (no trial — user is upgrading after trial)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
    });

    // Determine client secret for payment confirmation
    let clientSecret: string | null = null;
    if (
      subscription.pending_setup_intent &&
      typeof subscription.pending_setup_intent === "object"
    ) {
      clientSecret = (subscription.pending_setup_intent as { client_secret: string | null })
        .client_secret;
    } else {
      const latestInvoice = subscription.latest_invoice as {
        confirmation_secret?: { client_secret: string } | null;
      } | null;
      clientSecret = latestInvoice?.confirmation_secret?.client_secret ?? null;
    }

    // Update tenant with subscription info
    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        plan,
        billingInterval,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        trialEndsAt: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error("Upgrade error:", error);
    return NextResponse.json({ error: "Upgrade fehlgeschlagen" }, { status: 500 });
  }
}
