> **Showcase fork:** this file describes the original Supabase + Vercel deployment. The AI Lodge showcase deploys differently; see "What is deployed" and "Deployment" in README.md.

# Vercel deployment checklist

Deployment has not been performed. Complete this checklist only after reviewing the settings and approving publication.

## Supabase

1. Confirm the expense migration is applied and inspect the live `spendwise_expenses` RLS policies.
2. Under **Authentication → URL Configuration**, set the production Site URL to the final HTTPS origin.
3. Add the exact callback URL `https://YOUR-VERCEL-DOMAIN/auth/callback` to Redirect URLs. Add any approved Vercel preview callback patterns separately; do not allow broad untrusted redirects.
4. Keep email signup/confirmation enabled. Confirm email templates use the callback-compatible redirect/token format documented in [README.md](./README.md).
5. Configure custom SMTP with a verified sender and test delivery; Supabase's default SMTP is restricted and rate-limited.

## Vercel environment variables

Set these in the Vercel project for the appropriate environments:

| Variable | Scope | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public project URL | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key | Supabase publishable/anon key |
| `NEXT_PUBLIC_SITE_URL` | Public canonical origin | `https://YOUR-VERCEL-DOMAIN` |
| `AUTH_RECOVERY_SECRET` | Server only | Unique random value of at least 32 bytes |
| `OPENAI_API_KEY` | Server only | apiyi API key with suitable balance/limits |
| `OPENAI_BASE_URL` | Server only | `https://api.apiyi.com/v1` |
| `OPENAI_MODEL` | Server only | Model identifier enabled for the apiyi account |

Never add a Supabase service-role key to this app's browser environment. Do not prefix `AUTH_RECOVERY_SECRET` or `OPENAI_API_KEY` with `NEXT_PUBLIC_`. Configure the recovery secret separately per environment; a change invalidates any active recovery marker.

## Pre-deploy checks

- Set and verify production secrets in Vercel. Never copy secret values into the repository or browser environment.
- Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and the integration smoke checks.
- Verify sign-in, signup confirmation, password recovery, session persistence, and expense CRUD on the production domain with a dedicated test user.
- Verify AI categorisation returns `source: "ai"` using the selected apiyi model without exposing private user data.
- AI Spending Insights is paused in the interface because a successful live response has not been verified. Keep it paused until a deliberate, limited live test confirms the configured model returns valid structured output; do not represent the feature as working before then.
- Use `node scripts/create-local-demo-data.mjs` only to generate local fictional JSON examples; this file is not imported into Supabase or the deployed app.
- Use a dedicated demo account and remove only its test records.
- Check logs for secrets, tokens, personal data, and provider error bodies.
- Confirm project budget, usage alerts, abuse controls, and a shared rate limiter suitable for multiple Vercel instances.
- Add final app/video/source links and team information to [DEVPOST.md](./DEVPOST.md); cross-check the official hackathon rules and deadline.

## Publish

Deploy only after explicit owner approval. Verify the deployed URL, auth redirects, email delivery, CRUD, RLS, and AI categorisation before sharing it publicly. Cross-account RLS isolation has not been tested with separate live accounts; do not claim that test has passed.
