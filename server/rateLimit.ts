import type { Request, RequestHandler, Response } from "express";
import { createRateLimiter } from "./rateLimitEngine.js";

/**
 * Rate-limit adapter: the shared engine (rateLimitEngine.js) with this project's
 * slug and one bucket per AI route. The engine handles X-Forwarded-For, central
 * config from the control sheet, event mode, the kill switch (503) and fail-open.
 * Without Upstash credentials it is a no-op, which is what local dev wants.
 */
const limiter = createRateLimiter({
  // Slug = full project folder name (matches the central control-sheet rows).
  project: "ail-ay2627-s1-kezman-spendwise-ai",
  buckets: {
    categorize: Number(process.env.RATE_LIMIT_CATEGORIZE_MAX || 10),
    insights: Number(process.env.RATE_LIMIT_INSIGHTS_MAX || 5),
  },
  redisUrl: process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL,
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN,
  defaultWindow: Number(process.env.RATE_LIMIT_WINDOW_SECONDS || 432000),
});

export const limitCategorize = limiter("categorize");
export const limitInsights = limiter("insights");

/**
 * Runs a limiter inside a handler, right before the model call, so validation failures and
 * the no-key path never count. Resolves true when the request may proceed; false when the
 * engine has already answered (429 limit reached, 503 demo paused).
 */
export function passLimit(limit: RequestHandler, req: Request, res: Response): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let passed = false;
    Promise.resolve(limit(req, res, (err?: unknown) => {
      if (err) return reject(err);
      passed = true;
      resolve(true);
    }))
      .then(() => {
        if (!passed) resolve(false);
      })
      .catch(reject);
  });
}
