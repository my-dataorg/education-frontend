"use client";

import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import type { InstituteSummary } from "@/lib/api";

type Props = {
  instituteId: string;
  branches: InstituteSummary["branches"];
  onChanged: () => void;
};

export function CampusesTab({ instituteId, branches, onChanged }: Props) {
  const [branchName, setBranchName] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [addingBranch, setAddingBranch] = useState(false);
  const [error, setError] = useState("");

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    setAddingBranch(true);
    setError("");
    const res = await fetch(`/api/institutes/${instituteId}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: branchName.trim(),
        address: "",
        city: branchCity,
        isPrimary: false,
      }),
    });
    setAddingBranch(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.detail || "Failed to create campus");
      return;
    }
    setBranchName("");
    setBranchCity("");
    onChanged();
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold">All campuses</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Branches and locations for this institute
        </p>
        {branches.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No campuses yet. Add one below.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {branches.map((branch) => (
              <li
                key={branch.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{branch.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {branch.teacherCount + branch.studentCount} people
                      {branch.isPrimary && " · Main campus"}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4 text-primary" />
          Add campus
        </div>
        <form onSubmit={addBranch} className="mt-4 space-y-3">
          <input
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="Campus name"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
          <input
            value={branchCity}
            onChange={(e) => setBranchCity(e.target.value)}
            placeholder="City (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={addingBranch || !branchName.trim()}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {addingBranch ? "Creating..." : "Create campus"}
          </button>
        </form>
      </section>
    </div>
  );
}
