# SpendWise AI

SpendWise AI is a responsive expense tracker for recording personal spending, reviewing deterministic monthly statistics, suggesting categories with AI assistance, and getting coach-style AI commentary on a month's spending. It was built by Kezman Tang for the AI Lodge Hackathon. This fork is the AI Lodge showcase version (see [What is deployed](#what-is-deployed)).

## Problem Statement

Recording expenses is only useful when it is quick and the resulting spending data is easy to review. People need a simple way to capture transactions, understand where their money goes, and keep their financial data private.

## Solution Overview

SpendWise AI combines expense management with a dashboard of totals, category breakdowns, charts, search, and filtering. The app calculates all financial statistics from the recorded transactions; AI is used only for qualitative help: suggesting a category for a new expense, and interpreting one month's verified summary as patterns, savings ideas and recommendations.

## Key Features

- Create, view, edit, delete, search, and filter expenses.
- Dashboard totals, category summaries, and monthly charts calculated from the recorded transactions.
- AI-assisted expense categorisation with a clearly labelled keyword fallback and manual category override.
- AI Spending Insights for a chosen month: overview, key patterns, potential savings and recommendations.
- Responsive interface for desktop and mobile.

## What is deployed

The showcase is a public demo with no accounts:

- **Frontend (Vercel):** the Next.js app (`app/`, `components/`, `lib/`). Expenses are kept in the visitor's browser (`localStorage`, see `lib/expense-store.ts`); a first visit is seeded with nine fictional transactions for September and October 2026, and **Reset demo data** restores them. Nothing is stored on a server.
- **API (Cloud Run):** a small Express service in `server/`, bundled with esbuild, that runs the two AI steps:
  - `GET /api/health` → `{"status":"ok"}`
  - `POST /api/ai/categorize` `{ description }` → `{ category, explanation, source }`
  - `POST /api/ai/insights` `{ month, expenses: [{ amountCents, category }] }` → insights plus the verified summary. Only amounts and categories are sent; descriptions and notes stay in the browser.
- **Rate limit:** both AI routes go through the AI Lodge shared rate-limit engine (`server/rateLimitEngine.js`, buckets `categorize` and `insights`). Over the limit the API returns 429 and the app shows the AI Lodge card; a paused demo returns 503 and shows a notice. The rest of the app keeps working, and nothing replaces the AI answer after a 429.
- **Category suggestions are on request:** the visitor clicks **Suggest category** (the original asked the model while typing).

Left out of the showcase, but kept in this fork: the Supabase email/password accounts, password recovery and the expenses table (`supabase/migrations/`), and `scripts/create-local-demo-data.mjs`.

## AI Integration

Both AI steps call an OpenAI-compatible chat completions endpoint from the API, configured by env: `API_BASE_URL` (default `https://api.apiyi.com/v1`), `API_KEY` and `MODEL_NAME` (default `gemini-3.5-flash-lite`). The original `OPENAI_BASE_URL`, `OPENAI_API_KEY` and `OPENAI_MODEL` names are still read as fallbacks.

- **Categorisation** output is validated against the approved categories. If the provider fails or answers badly, the app returns a keyword match labelled "not AI"; it is never shown as AI output.
- **Insights** never compute figures: the API sums the month in code (`lib/insights.ts`), the model only interprets that summary, and its text is rejected if it states an amount, currency, percentage, decimal or date (`lib/ai.ts`). A rejected answer gets one corrective retry; if that also fails the API answers 502 and nothing is shown.

## External Tools & Datasets

- **AI Lodge apiyi** (OpenAI-compatible gateway) for categorisation and insights.
- **OpenAI Node SDK**, **Express**, **Next.js, React, TypeScript**, **Recharts**, **Zod**.
- No external financial dataset is used. The demo data is fictional.

## Installation & Setup

Requirements: Node.js 22+.

1. `npm install`
2. API: copy `.env.example` to `.env` and set `API_KEY` (leave it empty to run without AI). Start it with `npm run dev:server` (port 8080).
3. Frontend: copy `.env.local.example` to `.env.local` (`NEXT_PUBLIC_API_BASE=http://localhost:8080`) and run `npm run dev` (port 3000).

Checks: `npm test` (unit tests, including the insights flow against a stubbed model), `npm run lint`, `npm run build`, `npm run build:server`.

## Deployment

- **API:** `.github/workflows/deploy.yml` builds the `Dockerfile` (context: repo root), pushes it to Docker Hub and deploys the Cloud Run service `ail-ay2627-s1-kezman-spendwise-ai` with env from the `DOTENV` repo secret (`gh secret set DOTENV < .env`).
- **Frontend:** a Vercel project on the repo root (Next.js preset) with `NEXT_PUBLIC_API_BASE` set to the Cloud Run URL. Then put the Vercel URL in the API's `CORS_ORIGINS`.

## AI Safety & Limitations

- The provider key lives only in the API's environment; the browser never sees it.
- Expenses stay in the visitor's browser. Clearing site data removes them.
- Numeric totals and chart data are calculated by application code, not generated by a language model.
- AI categorisation can be overridden by the user; provider failures use the explicitly labelled keyword fallback.
- AI output is advisory and may be imperfect. The application is not financial, tax, or investment advice.
