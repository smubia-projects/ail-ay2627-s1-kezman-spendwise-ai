import assert from "node:assert/strict";
import test from "node:test";
import type OpenAI from "openai";
import { SpendingInsightSchema, containsUnverifiedFigure } from "../lib/ai";
import { buildVerifiedSummary, requestInsights } from "../lib/insights";
import { passLimit } from "../server/rateLimit";

// A stand-in for the OpenAI client: returns the queued replies in order and records each request.
function stubClient(replies: string[]) {
  const calls: { messages: unknown[] }[] = [];
  const client = {
    chat: {
      completions: {
        create: async (body: { messages: unknown[] }) => {
          calls.push({ messages: [...body.messages] });
          const content = replies.shift() ?? "";
          return { choices: [{ message: { content } }] };
        },
      },
    },
  } as unknown as OpenAI;
  return { client, calls };
}

const goodInsight = {
  overview: "Food & Dining is the largest category this month, with Education and Shopping well behind.",
  patterns: [{ title: "Eating out leads", detail: "Most of your top 3 categories are everyday meals and coffee." }],
  savings: [{ title: "Plan a few home meals", detail: "Cooking two or three dinners a week would trim the biggest category." }],
  recommendations: [{ title: "Keep tracking", detail: "Logging every purchase makes next month's picture clearer." }],
};

const october = [
  { amountCents: 720, category: "Food & Dining" },
  { amountCents: 180, category: "Transport" },
  { amountCents: 2350, category: "Education" },
  { amountCents: 3840, category: "Food & Dining" },
];

test("verified summary is computed in code", () => {
  const summary = buildVerifiedSummary("2026-10", october);
  assert.equal(summary.totalCents, 7090);
  assert.equal(summary.transactionCount, 4);
  assert.equal(summary.topCategories[0].category, "Food & Dining");
  assert.equal(summary.topCategories[0].amountCents, 4560);
  assert.equal(summary.dailyAverageCents, 7090 / 31);
});

test("insight schema allows words and small counts but rejects stated figures", () => {
  assert.equal(SpendingInsightSchema.safeParse(goodInsight).success, true);
  for (const figure of ["You spent $45", "about SGD 12", "40% on food", "12.50 on coffee", "1,200 in total", "since 2026", "ten dollars"]) {
    assert.equal(containsUnverifiedFigure(figure), true, figure);
  }
  for (const words of ["your top 3 categories", "two or three dinners", "Food & Dining is the largest"]) {
    assert.equal(containsUnverifiedFigure(words), false, words);
  }
});

test("insights accept a valid model reply, including one wrapped in a code fence", async () => {
  const { client, calls } = stubClient(["```json\n" + JSON.stringify(goodInsight) + "\n```"]);
  const result = await requestInsights(client, "stub-model", buildVerifiedSummary("2026-10", october));
  assert.deepEqual(result, goodInsight);
  assert.equal(calls.length, 1);
});

test("a reply that states a figure gets one corrective retry", async () => {
  const withFigure = { ...goodInsight, overview: "You spent $70.90 this month, mostly on food." };
  const { client, calls } = stubClient([JSON.stringify(withFigure), JSON.stringify(goodInsight)]);
  const result = await requestInsights(client, "stub-model", buildVerifiedSummary("2026-10", october));
  assert.deepEqual(result, goodInsight);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].messages.length, 4);
});

test("two invalid replies give null (the route answers 502), never a made-up insight", async () => {
  const { client, calls } = stubClient(["not json", JSON.stringify({ overview: "40% on food" })]);
  const result = await requestInsights(client, "stub-model", buildVerifiedSummary("2026-10", october));
  assert.equal(result, null);
  assert.equal(calls.length, 2);
});

test("passLimit lets a request through, or stops it when the engine has answered 429/503", async () => {
  const res = {} as never;
  const req = {} as never;
  assert.equal(await passLimit(async (_q, _s, next) => next(), req, res), true);
  let answered = 0;
  assert.equal(await passLimit(async () => { answered = 429; }, req, res), false);
  assert.equal(answered, 429);
});
