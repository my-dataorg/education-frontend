"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ContactFields } from "@/components/contact-fields";
import { createInstituteAction } from "@/lib/institute-actions";
import { contactReady, emptyContact, type ContactInput } from "@/lib/contact";
import { ModuleCard } from "@/components/shell/module-card";

export function CreateInstituteModule() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState<ContactInput>(emptyContact);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await createInstituteAction(name.trim(), contact);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      if (result.error.toLowerCase().includes("sign in")) router.push("/login");
      return;
    }
    setName("");
    setContact(emptyContact);
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
          <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-lg">
            <h2 className="font-serif text-lg font-semibold">Create institute</h2>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium" htmlFor="module-inst-name">
                  Institute name <span className="text-red-500">*</span>
                </label>
                <input
                  id="module-inst-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Riverside Academy"
                  required
                  minLength={2}
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              <ContactFields idPrefix="module-inst" value={contact} onChange={setContact} />
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
                  disabled={loading || name.trim().length < 2 || !contactReady(contact)}
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
