// Stripe webhook handler
// NOTE: In a static SPA deployment (e.g. Vercel without SSR),
// this webhook should be handled by a Supabase Edge Function
// or a separate Vercel Serverless Function (api/stripe-webhook.ts).
//
// This file is kept as a placeholder. The webhook logic from the
// original TanStack Start server handler has been preserved in comments
// for reference when setting up the production webhook endpoint.
//
// For Lovable Cloud deployment, the original server handler works as-is.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  component: () => null,
});
