"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUserName } from "@/components/user-identity";
import type { Member } from "@/lib/api";
import { SectionPickerDialog } from "@/components/section-picker-dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  kind: "teachers" | "students";
  sectionLabel: string;
  candidates: Member[];
  assignedIds: Set<string>;
  onConfirm: (userIds: string[]) => Promise<void>;
};

export function SectionMemberPickerDialog({
  open,
  onClose,
  kind,
  sectionLabel,
  candidates,
  assignedIds,
  onConfirm,
}: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelected([]);
      setError("");
    }
  }, [open]);

  const unassigned = useMemo(
    () => candidates.filter((p) => !assignedIds.has(p.userId)),
    [assignedIds, candidates]
  );

  const searchLower = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!searchLower) return unassigned;
    return unassigned.filter((p) => {
      const name = formatUserName(p).toLowerCase();
      const email = (p.email || "").toLowerCase();
      return name.includes(searchLower) || email.includes(searchLower);
    });
  }, [searchLower, unassigned]);

  const filteredIds = filtered.map((p) => p.userId);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.includes(id));

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  function toggleAllFiltered() {
    if (allFilteredSelected) {
      setSelected((current) => current.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelected((current) => [...new Set([...current, ...filteredIds])]);
    }
  }

  async function submit() {
    if (!selected.length) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm(selected);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add members");
    } finally {
      setBusy(false);
    }
  }

  const kindLabel = kind === "students" ? "students" : "teachers";

  return (
    <SectionPickerDialog
      open={open}
      onClose={onClose}
      title={`Add ${kindLabel} to ${sectionLabel}`}
      description={`Select ${kindLabel} who are not already in this class.`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || selected.length === 0}
            onClick={() => void submit()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy
              ? "Adding…"
              : selected.length
                ? `Add ${selected.length} to class`
                : "Add to class"}
          </button>
        </>
      }
    >
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      {filtered.length > 0 && (
        <button
          type="button"
          onClick={toggleAllFiltered}
          className="mt-2 text-xs font-medium text-primary hover:underline"
        >
          {allFilteredSelected ? "Clear selection" : "Select all shown"}
        </button>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      <ul className="mt-3 max-h-[min(50vh,320px)] space-y-1 overflow-y-auto">
        {filtered.map((person) => {
          const checked = selected.includes(person.userId);
          return (
            <li key={person.userId}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${
                  checked ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(person.userId)}
                  className="h-4 w-4 shrink-0 rounded border-border"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{formatUserName(person)}</p>
                  {person.email && (
                    <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                  )}
                </div>
              </label>
            </li>
          );
        })}
        {!filtered.length && (
          <li className="py-8 text-center text-sm text-muted-foreground">
            {unassigned.length === 0
              ? `All institute ${kindLabel} are already in this class.`
              : "No matches."}
          </li>
        )}
      </ul>
    </SectionPickerDialog>
  );
}
