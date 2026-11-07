import type { Request, Response } from "express";
import { z } from "zod";
import { categoryOptions } from "@/lib/expense-data";
import { buildVerifiedSummary, requestInsights } from "@/lib/insights";
import { getOpenAIConfiguration } from "@/lib/openai-client";
import { getOpenAIRequestFailure } from "@/lib/openai-errors";
import { passLimit, limitInsights } from "../rateLimit";

/**
 * POST /api/ai/insights — JSON: { month, expenses: [{ amountCents, category }] }.
 * Expenses live in the visitor's browser, so the page sends the selected month's amounts and
 * categories (no descriptions or notes). The figures are summed here and the model only interprets them.
 */

const InsightRequestSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  expenses: z
    .array(z.object({
      amountCents: z.number().int().positive().max(100_000_000),
      category: z.enum(categoryOptions),
    }))
    .max(2000),
});

export async function insightsHandler(req: Request, res: Response) {
  const parsedBody = InsightRequestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ message: "Select a valid month." });
  }
  const { month, expenses } = parsedBody.data;

  if (!expenses.length) {
    return res.status(422).json({ message: "There are no expenses recorded for this month yet.", code: "NO_EXPENSES" });
  }
  if (expenses.length < 2) {
    return res.status(422).json({
      message: "There is not enough spending data in this month to identify useful patterns yet.",
      code: "INSUFFICIENT_DATA",
    });
  }

  const openAI = getOpenAIConfiguration();
  if (!openAI) {
    return res.status(501).json({ message: "AI insights are unavailable because no API key is configured on the server." });
  }

  const verifiedSummary = buildVerifiedSummary(month, expenses);

  if (!(await passLimit(limitInsights, req, res))) return;

  try {
    const parsed = await requestInsights(openAI.client, openAI.model, verifiedSummary);
    if (!parsed) {
      return res.status(502).json({ message: "The AI returned an invalid insight response. Please try again." });
    }
    return res.json({ ...parsed, source: "ai", verifiedSummary });
  } catch (error) {
    const failure = getOpenAIRequestFailure(error);
    console.error("AI spending insight request failed.", {
      status: typeof error === "object" && error !== null && "status" in error ? error.status : undefined,
      providerCode: failure.providerCode,
      providerType: failure.providerType,
      requestId: failure.requestId,
      code: failure.code,
    });
    return res.status(failure.status).json({ message: failure.message, code: failure.code });
  }
}
