import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { categorizeHandler } from "./routes/categorize";
import { insightsHandler } from "./routes/insights";

/**
 * SpendWise AI API (Cloud Run). API-only: the Next.js frontend is deployed
 * separately on Vercel and calls these routes via NEXT_PUBLIC_API_BASE.
 * Expenses stay in the visitor's browser; the API only runs the two AI steps.
 *
 *   GET  /api/health           -> {"status":"ok"}
 *   POST /api/ai/categorize    -> suggest a category for a description   [rate limited: categorize]
 *   POST /api/ai/insights      -> coach-style insights on one month       [rate limited: insights]
 */

const app = express();
app.set("trust proxy", true);
app.disable("x-powered-by");

const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    // No CORS_ORIGINS set (local dev) -> allow any origin. Otherwise only the listed ones.
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)),
  }),
);

const json = express.json({ limit: "256kb" });

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/ai/categorize", json, categorizeHandler);
app.post("/api/ai/insights", json, insightsHandler);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found. This is the SpendWise AI API; the app itself is on the frontend." });
});

const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = Number((err as { status?: number }).status) || 500;
  if (status === 413) return res.status(413).json({ message: "That request is too large." });
  if (status === 400) return res.status(400).json({ message: "Invalid request body." });
  console.error(err);
  return res.status(500).json({ message: "Something went wrong on the server." });
};
app.use(onError);

const port = Number(process.env.PORT) || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`SpendWise AI API listening on 0.0.0.0:${port}`);
});
