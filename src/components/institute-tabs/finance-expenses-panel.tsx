"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable, formatPaise, Panel } from "@/components/institute-tabs/module-tab-ui";

type Expense = {
  id: string;
  category: string;
  kind: string;
  label: string;
  amountPaise: number;
  expenseDate: string;
  teacherUserId: string | null;
  notes: string;
};

export function FinanceExpensesPanel({
  instituteId,
  category,
  canManage,
  teacherOnly,
}: {
  instituteId: string;
  category: "staff" | "institute";
  canManage: boolean;
  teacherOnly?: boolean;
}) {
  const [items, setItems] = useState<Expense[]>([]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState(category === "staff" ? "salary" : "rent");
  const [teacherId, setTeacherId] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const q = teacherOnly ? "" : `?category=${category}`;
    const res = await fetch(`/api/institutes/${instituteId}/finance/expenses${q}`, {
      credentials: "include",
    });
    if (res.ok) setItems(await res.json());
  }, [category, instituteId, teacherOnly]);

  useEffect(() => {
    load().catch(() => setError("Could not load"));
  }, [load]);

  async function addExpense() {
    const response = await fetch(`/api/institutes/${instituteId}/finance/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        category,
        kind,
        label: label.trim() || (category === "staff" ? "Salary" : "Expense"),
        amountPaise: Number(amount),
        expenseDate,
        teacherUserId: category === "staff" ? teacherId.trim() || null : null,
        notes,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Could not save");
      return;
    }
    setLabel("");
    setAmount("");
    await load();
  }

  const title = teacherOnly ? "Your pay & bonuses" : category === "staff" ? "Staff pay" : "Institute costs";

  return (
    <Panel title={title}>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {canManage && !teacherOnly && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label"
            className="rounded-lg border border-border px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (paise)"
            className="rounded-lg border border-border px-3 py-2 text-sm"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            {category === "staff" ? (
              <>
                <option value="salary">Salary</option>
                <option value="bonus">Bonus</option>
              </>
            ) : (
              <>
                <option value="rent">Rent</option>
                <option value="utilities">Utilities</option>
                <option value="other">Other</option>
              </>
            )}
          </select>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          />
          {category === "staff" && (
            <input
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              placeholder="Teacher user ID"
              className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
            />
          )}
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
          />
          <button type="button" onClick={() => void addExpense()} className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground">
            Record
          </button>
        </div>
      )}
      <DataTable
        headers={["Date", "Label", "Type", "Amount"]}
        rows={items.map((e) => [
          e.expenseDate,
          e.label,
          e.kind,
          formatPaise(e.amountPaise),
        ])}
      />
      {items.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">No entries yet.</p>
      )}
    </Panel>
  );
}
