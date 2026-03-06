import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { stripe } from "@/lib/stripe";
import { resend } from "@/lib/resend";
import { db } from "@/lib/db";
import { getReferralCreditAmount, type PlanName } from "@/lib/plan-config";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await db.tenant.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            subscriptionStatus: sub.status,
            trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db.tenant.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { subscriptionStatus: "canceled" },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        // In Stripe v20, subscription is in invoice.parent.subscription_details.subscription
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);
        if (subscriptionId) {
          await db.tenant.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { subscriptionStatus: "past_due" },
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** In Stripe API 2026-01-28, subscription is nested inside parent.subscription_details */
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;
  if (
    parent?.type === "subscription_details" &&
    parent.subscription_details?.subscription
  ) {
    const sub = parent.subscription_details.subscription;
    return typeof sub === "string" ? sub : sub.id;
  }
  return null;
}

/** In Stripe API 2026-01-28, payment_intent is inside invoice.payment_intent */
function getPaymentIntentIdFromInvoice(invoice: Stripe.Invoice): string | null {
  // payment_intent may be expanded or just an ID reference - check for client_secret first
  const pi = (invoice as unknown as { payment_intent?: Stripe.PaymentIntent | string | null }).payment_intent;
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  // Update currentPeriodEnd via invoice period_end
  if (invoice.period_end) {
    await db.tenant.updateMany({
      where: { stripeCustomerId: customerId },
      data: { currentPeriodEnd: new Date(invoice.period_end * 1000) },
    });
  }

  // Tenant via Stripe Customer ID laden
  const tenant = await db.tenant.findUnique({
    where: { stripeCustomerId: customerId },
  });
  if (!tenant) return;

  // Abbruch wenn kein Referrer oder Kredit bereits vergeben
  if (!tenant.referredBy || tenant.referralUsed) return;

  // Zahlungsmethode laden und Fingerprint prüfen
  const paymentIntentId = getPaymentIntentIdFromInvoice(invoice);
  const paymentMethodId = paymentIntentId
    ? await getPaymentMethodFromIntent(paymentIntentId)
    : null;

  if (paymentMethodId) {
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    const fingerprint = pm.card?.fingerprint;

    if (fingerprint) {
      const fingerprintHash = createHash("sha256").update(fingerprint).digest("hex");
      const emailHash = createHash("sha256").update(tenant.referredBy.toLowerCase()).digest("hex");

      // Prüfen ob gleiche Zahlungsmethode bereits verwendet
      const existing = await db.usedPaymentMethod.findUnique({
        where: { paymentMethodHash: fingerprintHash },
      });

      if (existing) {
        // Missbrauch: Gleiche Karte → kein Kredit
        await db.tenant.update({ where: { id: tenant.id }, data: { referralUsed: true } });
        return;
      }

      // Zahlungsmethode als verwendet markieren
      await db.usedPaymentMethod.create({
        data: { paymentMethodHash: fingerprintHash, emailHash },
      });
    }
  }

  // Referrer-Tenant über referral code finden
  const referrer = await db.tenant.findUnique({
    where: { referralCode: tenant.referredBy },
  });
  if (!referrer || !referrer.stripeCustomerId) {
    await db.tenant.update({ where: { id: tenant.id }, data: { referralUsed: true } });
    return;
  }

  // Gutschrift berechnen
  const plan = tenant.plan as PlanName;
  const interval = (tenant.billingInterval ?? "monthly") as "monthly" | "annual";
  const creditAmount = getReferralCreditAmount(plan, interval);
  const creditCents = Math.round(creditAmount * 100);

  // Stripe Customer Balance Gutschrift
  try {
    await stripe.customers.createBalanceTransaction(referrer.stripeCustomerId, {
      amount: -creditCents,
      currency: "eur",
      description: `Referral-Gutschrift für Werbung von ${tenant.name}`,
    });
  } catch (err) {
    console.error("Failed to create Stripe balance transaction:", err);
    return;
  }

  // ReferralCredit in DB anlegen
  await db.referralCredit.create({
    data: {
      tenantId: referrer.id,
      referredTenantId: tenant.id,
      amount: creditAmount,
      status: "pending",
    },
  });

  // Tenant.referralUsed = true
  await db.tenant.update({ where: { id: tenant.id }, data: { referralUsed: true } });

  // E-Mail an Empfehlenden senden
  if (process.env.RESEND_API_KEY) {
    const referrerUser = await db.user.findFirst({
      where: { tenantId: referrer.id, role: "ADMIN" },
      select: { email: true, name: true },
    });

    if (referrerUser) {
      await resend.emails.send({
        from: "PropGate <noreply@propgate.de>",
        to: referrerUser.email,
        subject: "Ihre Empfehlungs-Gutschrift ist eingegangen!",
        html: buildReferralCreditEmail(referrerUser.name ?? referrerUser.email, creditAmount, tenant.name),
      });
    }
  }
}

async function getPaymentMethodFromIntent(paymentIntentId: string): Promise<string | null> {
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    return typeof pi.payment_method === "string" ? pi.payment_method : null;
  } catch {
    return null;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildReferralCreditEmail(recipientName: string, amount: number, referredTenantName: string): string {
  const safeName = escapeHtml(recipientName);
  const safeTenant = escapeHtml(referredTenantName);
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a2e;">Ihre Empfehlungs-Gutschrift ist eingegangen!</h2>
      <p>Hallo ${safeName},</p>
      <p>
        <strong>${safeTenant}</strong> hat gerade die erste Zahlung für sein PropGate-Abonnement abgeschlossen.
        Als Dankeschön für Ihre Empfehlung erhalten Sie eine Gutschrift von
        <strong>${amount.toFixed(2).replace(".", ",")} €</strong>
        auf Ihr nächstes Abonnement.
      </p>
      <p>Die Gutschrift wird automatisch von Ihrer nächsten Rechnung abgezogen.</p>
      <p style="margin-top: 32px; color: #666;">Ihr PropGate-Team</p>
    </div>
  `;
}
