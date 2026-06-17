"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_LABELS } from "@/lib/roles";

const ROLES = [
  { value: "student", label: ROLE_LABELS.student },
  { value: "teacher", label: ROLE_LABELS.teacher },
];

export function JoinInstituteForm() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [instituteId, setInstituteId] = useState("");
  const [role, setRole] = useState("student");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"code" | "form" | "done">("code");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch(
      `/api/institutes/lookup?joinCode=${encodeURIComponent(joinCode.trim().toUpperCase())}`,
      { credentials: "include" }
    );
    setLoading(false);
    if (!res.ok) {
      setError("Invalid join code. Check with your institute admin.");
      return;
    }
    const data = await res.json();
    setInstituteId(data.id);
    setInstituteName(data.name);
    setStep("form");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch(`/api/institutes/${instituteId}/join-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ requestedRole: role, message: message.trim() }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.detail || "Could not submit request.");
      return;
    }
    setStep("done");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
        <Link href="/institutes" className="text-sm text-primary hover:underline">
          ← Back to institutes
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Request to join</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your institute join code. An admin will review your request.
        </p>

        {step === "code" && (
          <form onSubmit={lookup} className="mt-8 space-y-4">
            <div>
              <label htmlFor="join-code" className="text-sm font-medium">
                Join code
              </label>
              <input
                id="join-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD34"
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm uppercase tracking-wider"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || !joinCode.trim()}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Looking up…" : "Continue"}
            </button>
          </form>
        )}

        {step === "form" && (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
              Requesting to join <strong>{instituteName}</strong>
            </p>
            <div>
              <label htmlFor="role" className="text-sm font-medium">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="message" className="text-sm font-medium">
                Message (optional)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Introduce yourself or explain why you're joining"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Submitting…" : "Submit request"}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 px-4 py-6 text-sm">
            <p className="font-medium">Request submitted</p>
            <p className="mt-2 text-muted-foreground">
              Your request to join <strong>{instituteName}</strong> is pending admin approval.
              You&apos;ll get a notification when it&apos;s reviewed.
            </p>
            <Link
              href="/institutes"
              className="mt-4 inline-block text-primary hover:underline"
            >
              Return to institutes
            </Link>
          </div>
        )}
      </main>
  );
}
