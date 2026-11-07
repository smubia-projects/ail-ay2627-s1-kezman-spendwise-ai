import { categoryOptions, type Expense } from "@/lib/expense-data";

/**
 * Expenses live in the visitor's browser (localStorage); the showcase has no accounts or database.
 * A first visit is seeded with the same fictional transactions as scripts/create-local-demo-data.mjs,
 * so the dashboard and AI insights have something to work with straight away.
 */

const STORAGE_KEY = "spendwise-ai:expenses:v1";

const demoExpenses: Omit<Expense, "createdAt">[] = [
  { id: "demo-sep-001", description: "Fictional cafe breakfast", amountCents: 850, category: "Food & Dining", date: "2026-09-03", notes: "Fictional demo transaction" },
  { id: "demo-sep-002", description: "Fictional train commute", amountCents: 240, category: "Transport", date: "2026-09-08", notes: "Fictional demo transaction" },
  { id: "demo-sep-003", description: "Fictional weekly groceries", amountCents: 4260, category: "Food & Dining", date: "2026-09-15", notes: "Fictional demo transaction" },
  { id: "demo-sep-004", description: "Fictional music subscription", amountCents: 1090, category: "Subscriptions", date: "2026-09-22", notes: "Fictional demo transaction" },
  { id: "demo-oct-001", description: "Fictional coffee with a friend", amountCents: 720, category: "Food & Dining", date: "2026-10-02", notes: "Fictional demo transaction" },
  { id: "demo-oct-002", description: "Fictional bus commute", amountCents: 180, category: "Transport", date: "2026-10-06", notes: "Fictional demo transaction" },
  { id: "demo-oct-003", description: "Fictional bookstore purchase", amountCents: 2350, category: "Education", date: "2026-10-11", notes: "Fictional demo transaction" },
  { id: "demo-oct-004", description: "Fictional family dinner", amountCents: 3840, category: "Food & Dining", date: "2026-10-18", notes: "Fictional demo transaction" },
  { id: "demo-oct-005", description: "Fictional household supplies", amountCents: 1575, category: "Shopping", date: "2026-10-24", notes: "Fictional demo transaction" },
];

export function getDemoExpenses(): Expense[] {
  return demoExpenses.map((expense) => ({ ...expense, createdAt: `${expense.date}T00:00:00.000Z` }));
}

function isExpense(value: unknown): value is Expense {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return typeof e.id === "string" && typeof e.description === "string" &&
    Number.isInteger(e.amountCents) && (e.amountCents as number) > 0 &&
    (categoryOptions as readonly string[]).includes(e.category as string) &&
    typeof e.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.notes === "string";
}

export function loadExpenses(): Expense[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const seeded = getDemoExpenses();
      saveExpenses(seeded);
      return seeded;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isExpense) : [];
  } catch {
    return getDemoExpenses();
  }
}

export function saveExpenses(expenses: Expense[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    // Storage full or blocked (private mode): the session keeps working in memory.
  }
}

export function resetExpenses(): Expense[] {
  const seeded = getDemoExpenses();
  saveExpenses(seeded);
  return seeded;
}

export function newExpenseId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `exp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
