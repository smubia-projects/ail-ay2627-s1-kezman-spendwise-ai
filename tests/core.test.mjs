import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import typescript from "typescript";

const require = createRequire(import.meta.url);
const testDirectory = path.dirname(fileURLToPath(import.meta.url));

function loadTypeScriptModule(relativePath) {
  const filename = path.join(testDirectory, "..", relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const output = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", output)(require, loaded, loaded.exports);
  return loaded.exports;
}

const expenseData = loadTypeScriptModule("lib/expense-data.ts");
const ai = loadTypeScriptModule("lib/ai.ts");
const openAIErrors = loadTypeScriptModule("lib/openai-errors.ts");

test("date-only expense values keep their calendar month", () => {
  assert.equal(expenseData.getMonthKey("2026-10-01"), "2026-10");
  assert.equal(expenseData.getMonthKey("2026-10-31"), "2026-10");
});

test("dashboard totals and categories derive from transaction cents", () => {
  const expenses = [
    { id: "one", amountCents: 550, category: "Food & Dining", date: "2026-10-12", description: "Chicken Rice", notes: "", createdAt: "" },
    { id: "two", amountCents: 234, category: "Transport", date: "2026-10-12", description: "Bus", notes: "", createdAt: "" },
  ];
  const dashboard = expenseData.calculateDashboard(expenses, "2026-10");
  assert.equal(dashboard.total, 784);
  assert.equal(dashboard.transactionCount, 2);
  assert.equal(dashboard.highestSpendingCategory.category, "Food & Dining");
  assert.equal(dashboard.monthlyTrend[0].total, 784);
});

test("AI categorisation output is restricted to approved categories", () => {
  assert.equal(ai.safeJsonParse(
    '{"category":"Transport","explanation":"A travel fare."}',
    ai.CategorySuggestionSchema,
  ).category, "Transport");
  assert.equal(ai.safeJsonParse(
    '{"category":"Banking","explanation":"A made-up category."}',
    ai.CategorySuggestionSchema,
  ), null);
});

test("insight text rejects unverified numeric financial claims", () => {
  const valid = {
    overview: "Food is the largest category in this snapshot.",
    patterns: [{ title: "Category mix", detail: "Food is the largest recorded category." }],
    savings: [{ title: "Review recurring costs", detail: "Check subscriptions for services you no longer use." }],
    recommendations: [{ title: "Keep tracking", detail: "More entries can reveal useful habits." }],
  };
  assert.equal(ai.SpendingInsightSchema.safeParse(valid).success, true);
  assert.equal(ai.SpendingInsightSchema.safeParse({
    ...valid,
    overview: "You spent $500 this month.",
  }).success, false);
});

test("OpenAI quota and rate-limit errors produce safe actionable classifications", () => {
  const quota = openAIErrors.getOpenAIRequestFailure({
    status: 429,
    code: "insufficient_quota",
    type: "insufficient_quota",
  });
  assert.equal(quota.code, "PROVIDER_QUOTA_EXHAUSTED");
  assert.equal(quota.status, 502);

  const limited = openAIErrors.getOpenAIRequestFailure({
    status: 429,
    code: "rate_limit_exceeded",
    headers: new Headers({ "retry-after": "12" }),
  });
  assert.equal(limited.code, "PROVIDER_RATE_LIMITED");
  assert.equal(limited.status, 502);
  assert.equal(limited.retryAfterSeconds, 12);

  const ambiguous = openAIErrors.getOpenAIRequestFailure({ status: 429 });
  assert.equal(ambiguous.code, "PROVIDER_429_UNCLASSIFIED");
  assert.match(ambiguous.message, /temporary rate limit or insufficient quota/);
});
