"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

type Institute = { id: string; name: string; role: string; joinCode: string };

function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ManageInstitutesDropdown() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"create" | "delete" | "join" | null>(null);

  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [owned, setOwned] = useState<Institute[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function openDialog(type: "create" | "delete" | "join") {
    setMenuOpen(false);
    setError("");
    setDialog(type);
    if (type === "delete") loadOwned();
  }

  async function loadOwned() {
    const res = await fetch("/api/institutes");
    if (!res.ok) return;
    const list: Institute[] = await res.json();
    setOwned(list.filter((i) => i.role === "owner"));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/institutes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Could not create institute.");
      return;
    }
    const inst = await res.json();
    setDialog(null);
    setName("");
    router.push(`/institutes/${inst.id}`);
    router.refresh();
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/institutes/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Invalid join code.");
      return;
    }
    const inst = await res.json();
    setDialog(null);
    setJoinCode("");
    router.push(`/institutes/${inst.id}`);
    router.refresh();
  }

  async function handleDelete(id: string, instituteName: string) {
    if (!confirm(`Delete "${instituteName}"? This cannot be undone.`)) return;
    setDeletingId(id);
    setError("");
    const res = await fetch(`/api/institutes/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      setError("Could not delete institute.");
      return;
    }
    setOwned((prev) => prev.filter((i) => i.id !== id));
    setDialog(null);
    router.push("/institutes");
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
      >
        Manage institutes
        <ChevronDown className={`h-4 w-4 transition ${menuOpen ? "rotate-180" : ""}`} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 z-40 mt-1 w-48 rounded-xl border border-border bg-card py-1 shadow-lg">
          <button
            type="button"
            onClick={() => openDialog("create")}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-muted"
          >
            Create institute
          </button>
          <button
            type="button"
            onClick={() => openDialog("delete")}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-muted"
          >
            Delete institute
          </button>
          <button
            type="button"
            onClick={() => openDialog("join")}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-muted"
          >
            Join with code
          </button>
        </div>
      )}

      <Dialog open={dialog === "create"} onClose={() => setDialog(null)} title="Create institute">
        <p className="mb-4 text-sm text-muted-foreground">
          You will be the owner and can add sections, teachers, and students.
        </p>
        <form onSubmit={handleCreate}>
          <label className="text-sm font-medium" htmlFor="inst-name">
            Institute name <span className="text-red-500">*</span>
          </label>
          <input
            id="inst-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Riverside Academy"
            className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
            required
            minLength={2}
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setDialog(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || name.trim().length < 2}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog open={dialog === "delete"} onClose={() => setDialog(null)} title="Delete institute">
        <p className="mb-4 text-sm text-muted-foreground">
          Institutes you own. Deleting removes all sections, assignments, and members.
        </p>
        {owned.length === 0 ? (
          <p className="text-sm text-muted-foreground">You do not own any institutes.</p>
        ) : (
          <ul className="space-y-2">
            {owned.map((inst) => (
              <li
                key={inst.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <span className="text-sm font-medium">{inst.name}</span>
                <button
                  type="button"
                  disabled={deletingId === inst.id}
                  onClick={() => handleDelete(inst.id, inst.name)}
                  className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === inst.id ? "Deleting..." : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Dialog>

      <Dialog open={dialog === "join"} onClose={() => setDialog(null)} title="Join with code">
        <p className="mb-4 text-sm text-muted-foreground">
          Enter the code from your institute admin.
        </p>
        <form onSubmit={handleJoin}>
          <label className="text-sm font-medium" htmlFor="join-code">
            Join code <span className="text-red-500">*</span>
          </label>
          <input
            id="join-code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC12XYZ"
            className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm uppercase"
            required
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setDialog(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !joinCode.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Joining..." : "Join"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
