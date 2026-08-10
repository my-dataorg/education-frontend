"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createInstituteAction } from "@/lib/institute-actions";
import { ModuleCard } from "@/components/shell/module-card";

export function CreateInstituteModule() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await createInstituteAction(name.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      if (result.error.toLowerCase().includes("sign in")) router.push("/login");
      return;
    }
    router.push(`/institutes/${result.institute.id}`);
    router.refresh();
  }

  return (
    <>
      <ModuleCard
        icon={<Plus className="h-6 w-6" />}
        title="Create institute"
        description="You will be the owner and can add sections, teachers, and students."
        onClick={() => setOpen(true)}
      />
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
            <h2 className="font-serif text-lg font-semibold">Create institute</h2>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Institute name"
                required
                minLength={2}
                autoFocus
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
                >
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
          </div>
        </div>
      )}
    </>
  );
}
