"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

type RosterItem = {
  userId?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  kind?: string;
  className?: string;
  sectionName?: string;
};

type Props = {
  instituteId: string;
  branchId?: string | null;
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
};

function labelFor(item: RosterItem) {
  const name =
    item.displayName?.trim() ||
    `${item.firstName || ""} ${item.lastName || ""}`.trim() ||
    item.userId ||
    "Member";
  const role = item.role || item.kind || "";
  const cls =
    item.className && item.sectionName
      ? `${item.className}-${item.sectionName}`
      : item.className || "";
  return { name, meta: [role, cls].filter(Boolean).join(" · ") };
}

export function MemberAudiencePicker({ instituteId, branchId, selectedUserIds, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RosterItem[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ tab: "all", q: query.trim(), page: "1", pageSize: "15" });
      if (branchId) params.set("branch", branchId);
      setLoading(true);
      fetch(`/api/institutes/${instituteId}/members/roster?${params}`, { credentials: "include" })
        .then(async (res) => {
          if (!res.ok) return { items: [] };
          return res.json();
        })
        .then((data: { items?: RosterItem[] }) => {
          const items = (data.items || []).filter((row) => row.userId);
          setResults(items);
          setLabels((current) => {
            const next = { ...current };
            for (const row of items) {
              if (row.userId) next[row.userId] = labelFor(row).name;
            }
            return next;
          });
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [branchId, instituteId, query]);

  function addUser(userId: string, name: string) {
    if (selectedUserIds.includes(userId)) return;
    setLabels((current) => ({ ...current, [userId]: name }));
    onChange([...selectedUserIds, userId]);
    setQuery("");
    setResults([]);
  }

  function removeUser(userId: string) {
    onChange(selectedUserIds.filter((id) => id !== userId));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">People</p>
      {selectedUserIds.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selectedUserIds.map((userId) => (
            <li
              key={userId}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
            >
              <span>{labels[userId] || userId.slice(0, 8)}</span>
              <button
                type="button"
                onClick={() => removeUser(userId)}
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name (min 2 characters)"
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
        />
      </div>
      {loading && <p className="text-xs text-muted-foreground">Searching…</p>}
      {results.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-card text-sm">
          {results.map((row) => {
            if (!row.userId) return null;
            const { name, meta } = labelFor(row);
            const picked = selectedUserIds.includes(row.userId);
            return (
              <li key={row.userId}>
                <button
                  type="button"
                  disabled={picked}
                  onClick={() => addUser(row.userId!, name)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted/50 disabled:opacity-50"
                >
                  <span className="font-medium">{name}</span>
                  {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
