"use client";

import { useState } from "react";
import { DataTable, LabeledInput } from "@/components/institute-tabs/module-tab-ui";
import { CollapsiblePanel } from "@/components/configure-shared/collapsible-panel";
import { FeeDialog } from "@/components/configure-fees/fee-dialog";

export type FeeType = { id: string; name: string; amountPaise: number };

async function apiErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({}));
  if (typeof body.detail === "string") return body.detail;
  return fallback;
}

export function FeeTypesPanel({
  instituteId,
  types,
  onChanged,
}: {
  instituteId: string;
  types: FeeType[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function addType() {
    const clean = name.trim();
    if (!clean) {
      setError("Enter a name");
      return;
    }
    const res = await fetch(`/api/institutes/${instituteId}/fee-structures`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clean, amountPaise: 100 }),
    });
    if (!res.ok) {
      setError(await apiErrorMessage(res, "Could not add type"));
      return;
    }
    setOpen(false);
    setName("");
    setError("");
    onChanged();
  }

  return (
    <CollapsiblePanel title="Types of payment" defaultOpen={false}>
      <p className="mb-3 text-sm text-muted-foreground">
        Institute-wide fee names (library, hostel, tuition, etc.). These appear in the dropdown when you assign fees on
        the left.
      </p>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setName("");
            setError("");
          }}
          className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
        >
          + Add type
        </button>
      </div>
      {types.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payment types yet.</p>
      ) : (
        <DataTable headers={["Name"]} rows={types.map((t) => [t.name])} />
      )}

      <FeeDialog open={open} title="Add payment type" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <LabeledInput label="Name" value={name} onChange={setName} />
          <p className="text-xs text-muted-foreground">Examples: Library fee, Hostel fee, Admin fee, Study fee</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="button"
            onClick={() => void addType()}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
          >
            Save type
          </button>
        </div>
      </FeeDialog>
    </CollapsiblePanel>
  );
}
