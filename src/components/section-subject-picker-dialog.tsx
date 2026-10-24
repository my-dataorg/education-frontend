"use client";

import { useEffect, useMemo, useState } from "react";
import type { Subject } from "@/lib/api";
import { SectionPickerDialog } from "@/components/section-picker-dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  sectionLabel: string;
  catalog: Subject[];
  linkedIds: Set<string>;
  onConfirm: (subjectIds: string[]) => Promise<void>;
};

export function SectionSubjectPickerDialog({
  open,
  onClose,
  sectionLabel,
  catalog,
  linkedIds,
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

  const available = useMemo(
    () => catalog.filter((s) => !linkedIds.has(s.id)),
    [catalog, linkedIds]
  );

  const searchLower = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!searchLower) return available;
    return available.filter((s) => s.name.toLowerCase().includes(searchLower));
  }, [available, searchLower]);

  const filteredIds = filtered.map((s) => s.id);
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
      setError(e instanceof Error ? e.message : "Could not add subjects");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionPickerDialog
      open={open}
      onClose={onClose}
      title={`Add subjects to ${sectionLabel}`}
      description="Select subjects from the institute catalog."
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
            {busy ? "Adding…" : `Add ${selected.length} subject${selected.length === 1 ? "" : "s"}`}
          </button>
        </>
      }
    >
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search subjects"
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
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ul className="mt-3 max-h-[min(50vh,320px)] space-y-1 overflow-y-auto">
        {filtered.map((subject) => {
          const checked = selected.includes(subject.id);
          return (
            <li key={subject.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${
                  checked ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(subject.id)}
                  className="h-4 w-4 shrink-0 rounded border-border"
                />
                <span className="text-sm font-medium">{subject.name}</span>
              </label>
            </li>
          );
        })}
        {!filtered.length && (
          <li className="py-8 text-center text-sm text-muted-foreground">
            {available.length === 0
              ? "All catalog subjects are already linked."
              : "No matches."}
          </li>
        )}
      </ul>
    </SectionPickerDialog>
  );
}
