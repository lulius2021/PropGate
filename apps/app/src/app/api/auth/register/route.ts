import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { validatePassword } from "@/lib/password-policy";
import { PLAN_LIMITS, type PlanName } from "@/lib/plan-config";
import { checkRateLimit } from "@/lib/rate-limit";

const REFERRAL_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne 0,O,1,I,L

function generateReferralCode(): string {
  const randomPart = Array.from(
    { length: 6 },
    () => REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)]
  ).join("");
  return `PG-${randomPart}`;
}

async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateReferralCode();
    const existing = await db.tenant.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate unique referral code");
}

type PaidPlanId = "starter" | "plus" | "pro" | "unlimited";

function isPaidPlan(plan: string): plan is PaidPlanId {
  return ["starter", "plus", "pro", "unlimited"].includes(plan);
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, resetIn } = checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Zu viele Anfragen. Versuchen Sie es in ${resetIn} Sekunden erneut.` },
        { status: 429 }
      );
    }

    const { name, company, phone: _phone, email, password, plan, billing, referralCode } =
      await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Alle Felder sind erforderlich" }, { status: 400 });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.errors[0] }, { status: 400 });
    }

    const existing = await db.user.findFirst({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Registrierung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben oder versuchen Sie es mit einer anderen E-Mail." },
        { status: 400 }
      );
    }

    // Referral-Code validieren falls angegeben
    let referrerTenant: { id: string; referralCode: string | null } | null = null;
    if (referralCode) {
      referrerTenant = await db.tenant.findUnique({
        where: { referralCode },
        select: { id: true, referralCode: true },
      });
      if (!referrerTenant) {
        return NextResponse.json({ error: "Ungültiger Referral-Code" }, { status: 400 });
      }
    }

    const passwordHash = await hash(password, 12);
    const newReferralCode = await generateUniqueReferralCode();
    const resolvedPlan = isPaidPlan(plan) ? plan : "trial";
    const billingInterval = billing === "annual" ? "annual" : "monthly";

    // Für Trial-Plan: Direkt erstellen ohne Stripe
    if (!isPaidPlan(resolvedPlan)) {
      const trialDays = referrerTenant ? 60 : 30;
      const user = await db.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "ADMIN",
          tenant: {
            create: {
              name: company?.trim() || `${name}'s Workspace`,
              plan: "starter", // Trial startet als Starter
              trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
              referralCode: newReferralCode,
              referredBy: referrerTenant?.referralCode ?? null,
            },
          },
        },
        select: { id: true, email: true, name: true, tenantId: true },
      });
      return NextResponse.json({ success: true, user });
    }

    // Für bezahlte Pläne: Stripe-Integration
    if (!process.env.STRIPE_SECRET_KEY) {
      // Fallback wenn Stripe nicht konfiguriert
      const user = await db.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "ADMIN",
          tenant: {
            create: {
              name: company?.trim() || `${name}'s Workspace`,
              plan: resolvedPlan,
              referralCode: newReferralCode,
              referredBy: referrerTenant?.referralCode ?? null,
              billingInterval,
            },
          },
        },
        select: { id: true, email: true, name: true, tenantId: true },
      });
      return NextResponse.json({ success: true, user });
    }

    // Stripe ist konfiguriert → Customer + Subscription erstellen
    const { stripe } = await import("@/lib/stripe");

    const planConfig = PLAN_LIMITS[resolvedPlan as PlanName];
    const priceId =
      billingInterval === "annual"
        ? planConfig.stripePriceIdAnnual
        : planConfig.stripePriceIdMonthly;

    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe Price ID nicht konfiguriert. Bitte Phase 3 abschließen." },
        { status: 500 }
      );
    }

    // 1. Stripe Customer erstellen
    const customer = await stripe.customers.create({
      email,
      name: company?.trim() || name,
      metadata: { tenantName: company?.trim() || name },
    });

    // 2. Trial-Tage: 30 Tage wenn gültiger Referral-Code
    const trialPeriodDays = referrerTenant ? 30 : 0;

    // 3. Subscription erstellen
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
      ...(trialPeriodDays > 0 ? { trial_period_days: trialPeriodDays } : {}),
    });

    // Client Secret ermitteln (Stripe v20: confirmation_secret oder pending_setup_intent)
    let clientSecret: string | null = null;
    if (
      subscription.pending_setup_intent &&
      typeof subscription.pending_setup_intent === "object"
    ) {
      // Trial: SetupIntent zum Hinterlegen der Karte
      clientSecret = (subscription.pending_setup_intent as { client_secret: string | null })
        .client_secret;
    } else {
      // Direktzahlung: confirmation_secret auf der Invoice (Stripe v20)
      const latestInvoice = subscription.latest_invoice as {
        confirmation_secret?: { client_secret: string } | null;
      } | null;
      clientSecret = latestInvoice?.confirmation_secret?.client_secret ?? null;
    }

    // 4. User + Tenant in DB erstellen
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "ADMIN",
        tenant: {
          create: {
            name: company?.trim() || `${name}'s Workspace`,
            plan: resolvedPlan,
            stripeCustomerId: customer.id,
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            billingInterval,
            referralCode: newReferralCode,
            referredBy: referrerTenant?.referralCode ?? null,
            trialEndsAt:
              subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          },
        },
      },
      select: { id: true, email: true, name: true, tenantId: true },
    });

    return NextResponse.json({ success: true, user, clientSecret, subscriptionId: subscription.id });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registrierung fehlgeschlagen" }, { status: 500 });
  }
}
