"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UserSuggestion = {
  userId: string;
  email: string;
  username: string;
  displayName: string;
};

type InviteUserFieldProps = {
  instituteId: string;
  value: string;
  selectedUserId: string | null;
  onChange: (value: string, user: UserSuggestion | null) => void;
  disabled?: boolean;
};

export function InviteUserField({
  instituteId,
  value,
  selectedUserId,
  onChange,
  disabled,
}: InviteUserFieldProps) {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/institutes/${instituteId}/users/search?q=${encodeURIComponent(query.trim())}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          setSuggestions([]);
          setOpen(false);
          return;
        }
        const data: UserSuggestion[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } finally {
        setLoading(false);
      }
    },
    [instituteId]
  );

  useEffect(() => {
    if (selectedUserId) return;
    const timer = setTimeout(() => {
      void fetchSuggestions(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, selectedUserId, fetchSuggestions]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function pick(user: UserSuggestion) {
    const label = user.displayName || user.username || user.email;
    const text = user.email ? `${label} (${user.email})` : label;
    onChange(text, user);
    setSuggestions([]);
    setOpen(false);
  }

  function handleInput(next: string) {
    onChange(next, null);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        placeholder="Search by name, username, or email"
        required
        disabled={disabled}
        autoComplete="off"
        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
      />
      {loading && value.trim().length >= 2 && !selectedUserId && (
        <p className="mt-1 text-xs text-muted-foreground">Searching...</p>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg">
          {suggestions.map((user) => (
            <li key={user.userId}>
              <button
                type="button"
                onClick={() => pick(user)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium">{user.displayName || user.username}</span>
                <span className="text-xs text-muted-foreground">
                  {user.username}
                  {user.email ? ` · ${user.email}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
