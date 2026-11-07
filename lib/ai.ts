import { z } from "zod";

export const categoryOptions = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Health & Fitness",
  "Education",
  "Travel",
  "Subscriptions",
  "Personal Care",
  "Other",
] as const;

export const CategorySuggestionSchema = z.object({
  category: z.enum(categoryOptions),
  explanation: z.string().min(1).max(220),
});

const SpendingInsightContentSchema = z.object({
  overview: z.string().min(1).max(350),
  patterns: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        detail: z.string().min(1).max(220),
      }),
    )
    .min(1)
    .max(3),
  savings: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        detail: z.string().min(1).max(220),
      }),
    )
    .min(1)
    .max(3),
  recommendations: z
    .array(
      z.object({
        title: z.string().min(1).max(60),
        detail: z.string().min(1).max(220),
      }),
    )
    .min(1)
    .max(3),
});

// Financial figures are calculated in code, so the model must not state its own: no currency symbols or
// codes, percentages, decimals or grouped thousands. A bare small number ("your top two categories",
// "about 3 coffees") is not a financial claim, and rejecting every digit made most real model answers fail.
const UNVERIFIED_FIGURE = /[$€£¥]|\b(?:SGD|S\$|USD|dollars?|cents?)\b|\d\s*%|percent|\d[.,]\d|\d{4,}/i;

export function containsUnverifiedFigure(text: string) {
  return UNVERIFIED_FIGURE.test(text);
}

export const SpendingInsightSchema = SpendingInsightContentSchema.refine(
  (insight) =>
    [insight.overview, ...insight.patterns, ...insight.savings, ...insight.recommendations]
    .every((item) => {
      const text = typeof item === "string" ? item : `${item.title} ${item.detail}`;
      return !containsUnverifiedFigure(text);
    }),
  { message: "Insight text must not contain unverified numeric financial claims." },
);

export const fallbackCategoryLookup = [
  { pattern: /grab|uber|taxi|bus|train|ride/i, category: "Transport" },
  { pattern: /chicken rice|lunch|dinner|coffee|restaurant|cafe|food|breakfast|makan/i, category: "Food & Dining" },
  { pattern: /netflix|spotify|youtube|prime|subscription|membership/i, category: "Subscriptions" },
  { pattern: /uniqlo|asos|shopee|zalora|cloth|bag|shirt|shoe|shopping/i, category: "Shopping" },
  { pattern: /movie|cinema|concert|game|streaming|tickets/i, category: "Entertainment" },
  { pattern: /bill|electricity|water|wifi|phone|utility|rent/i, category: "Bills & Utilities" },
  { pattern: /gym|workout|protein|health|clinic|pharmacy|doctor/i, category: "Health & Fitness" },
  { pattern: /course|tuition|school|book|exam|study/i, category: "Education" },
  { pattern: /flight|hotel|airline|visa|travel|trip|airport/i, category: "Travel" },
  { pattern: /skincare|soap|toothbrush|cosmetic|personal|care/i, category: "Personal Care" },
];

export function inferCategoryFallback(description: string) {
  const clean = description.trim();
  const match = fallbackCategoryLookup.find(({ pattern }) => pattern.test(clean));
  const category = match?.category ?? "Other";
  const explanation =
    category === "Other"
      ? "No clear category match was found, so the expense was grouped under Other."
      : `This description appears to fit ${category} based on the wording and common spending patterns.`;

  return { category, explanation };
}

export function safeJsonParse<T>(value: string, schema: z.ZodType<T>) {
  try {
    const normalized = value.trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(normalized);
    return schema.parse(parsed);
  } catch {
    return null;
  }
}
