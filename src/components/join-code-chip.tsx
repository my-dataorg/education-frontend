"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, MoreVertical, RefreshCw } from "lucide-react";

type Props = {
  code: string;
  instituteId?: string;
  canRegenerate?: boolean;
  onCodeChange?: (code: string) => void;
};

export function JoinCodeChip({ code, instituteId, canRegenerate = false, onCodeChange }: Props) {
  const [current, setCurrent] = useState(code);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [regenerateAvailable, setRegenerateAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(code);
  }, [code]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function copy() {
    await navigator.clipboard.writeText(current);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerate() {
    if (!instituteId || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/institutes/${instituteId}/join-code/regenerate`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 404) {
        setRegenerateAvailable(false);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { joinCode: string };
      setCurrent(data.joinCode);
      onCodeChange?.(data.joinCode);
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  return (
    <div className="relative inline-flex items-center gap-1" ref={menuRef}>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-sm transition hover:bg-muted/60"
      >
        <span className="text-muted-foreground">Join</span>
        <code className="font-semibold tracking-wider">{current}</code>
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        {copied ? <span className="text-primary">Copied</span> : null}
      </button>
      {canRegenerate && instituteId && regenerateAvailable && (
        <>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-full border border-border bg-card p-1.5 text-muted-foreground shadow-sm hover:bg-muted/60"
            aria-label="Join code options"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-border bg-card py-1 text-xs shadow-md">
              <button
                type="button"
                disabled={busy}
                onClick={() => void regenerate()}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate code
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
