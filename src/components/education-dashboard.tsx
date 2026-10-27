"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, Building2, ChevronRight, KeyRound, Terminal, Trash2 } from "lucide-react";
import type { Institute } from "@/lib/api";
import { deleteInstituteAction } from "@/lib/institute-actions";
import { ROLE_LABELS } from "@/lib/roles";
import { CreateInstituteModule } from "@/components/create-institute-module";

export function EducationDashboard({ institutes }: { institutes: Institute[] }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Your institutes</h2>
        {institutes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            No institutes yet. Create one or join with a code using the tools on the right.
          </p>
        ) : (
          <ul className="space-y-2">
            {institutes.map((inst) => (
              <InstituteRow key={inst.id} institute={inst} />
            ))}
          </ul>
        )}
      </section>
      <aside className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tools</p>
        <CreateInstituteModule compact />
        <ToolLink
          href="/institutes/join"
          icon={<KeyRound className="h-5 w-5" />}
          title="Join with code"
          description="Request access with a join code."
        />
        <ToolLink
          href="/learning-hub"
          icon={<BookOpen className="h-5 w-5" />}
          title="Learning hub"
          description="Lessons will be added here."
        />
        <ToolLink
          href="/lab"
          icon={<Terminal className="h-5 w-5" />}
          title="Lab"
          description="Write and run Python on this server."
        />
      </aside>
    </div>
  );
}

function InstituteRow({ institute }: { institute: Institute }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const isOwner = institute.role === "owner";

  async function onDelete() {
    setDeleting(true);
    setError("");
    const result = await deleteInstituteAction(institute.id);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <>
      <li className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-shell text-shell-foreground">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{institute.name}</p>
          <p className="text-xs text-muted-foreground">
            {ROLE_LABELS[institute.role] || institute.role}
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
            aria-label={`Deactivate ${institute.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <Link
          href={`/institutes/${institute.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Open
          <ChevronRight className="h-4 w-4" />
        </Link>
      </li>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => !deleting && setConfirmOpen(false)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <h3 className="font-serif text-lg font-semibold">Deactivate institute?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              <strong>{institute.name}</strong> will be hidden from your dashboard. Data is kept on
              the server but the institute is inactive. This cannot be undone from the app today.
            </p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void onDelete()}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {deleting ? "Deactivating…" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ToolLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex gap-3 rounded-xl border border-border bg-muted/30 px-3 py-3 transition hover:border-primary/30 hover:bg-muted/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-shell text-shell-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs leading-snug text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
