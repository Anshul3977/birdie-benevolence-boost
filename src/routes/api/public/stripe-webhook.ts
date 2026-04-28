import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import Stripe from "stripe";

type SubStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

function mapStatus(s: string): SubStatus {
  const allowed: SubStatus[] = [
    "incomplete",
    "incomplete_expired",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "paused",
  ];
  return (allowed.includes(s as SubStatus) ? s : "incomplete") as SubStatus;
}

async function upsertFromSubscription(sub: Stripe.Subscription) {
  const userId = (sub.metadata?.user_id as string) || null;
  if (!userId) {
    console.warn("Stripe sub missing user_id metadata", sub.id);
    return;
  }
  const plan = (sub.metadata?.plan as "monthly" | "yearly") || null;
  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;

  await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      status: mapStatus(sub.status),
      plan,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!secret || !stripeKey) {
          return new Response("Webhook not configured", { status: 500 });
        }
        const stripe = new Stripe(stripeKey, {
          apiVersion: "2025-03-31.basil" as Stripe.LatestApiVersion,
        });
        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("Missing signature", { status: 400 });
        const body = await request.text();
        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, secret);
        } catch (err) {
          console.error("Webhook signature failed", err);
          return new Response("Invalid signature", { status: 401 });
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              if (session.subscription) {
                const sub = await stripe.subscriptions.retrieve(session.subscription as string);
                // Ensure metadata carries through
                if (!sub.metadata?.user_id && session.metadata?.user_id) {
                  await stripe.subscriptions.update(sub.id, {
                    metadata: {
                      user_id: session.metadata.user_id,
                      plan: session.metadata.plan ?? "",
                    },
                  });
                  sub.metadata = {
                    user_id: session.metadata.user_id,
                    plan: session.metadata.plan ?? "",
                  };
                }
                await upsertFromSubscription(sub);
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              await upsertFromSubscription(event.data.object as Stripe.Subscription);
              break;
            }
          }
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Webhook handler error", err);
          return new Response("Handler error", { status: 500 });
        }
      },
    },
  },
});
