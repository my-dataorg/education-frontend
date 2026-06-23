"use client";

import Link from "next/link";
import { Building2, MapPin, Plus } from "lucide-react";
import type { Institute } from "@/lib/api";
import type { InstituteSummary } from "@/lib/api";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import type { InstituteTabId } from "@/lib/institute-tabs";
import { ROLE_LABELS } from "@/lib/roles";

type Props = {
  institutes: Institute[];
  instituteId: string;
  branches: InstituteSummary["branches"];
  selectedBranchId: string | null;
  canManage: boolean;
  campusesTabHref?: string;
  searchParams?: URLSearchParams;
};

export function InstituteShell({
  institutes,
  instituteId,
  branches,
  selectedBranchId,
  canManage,
  campusesTabHref,
  searchParams,
  children,
}: Props & { children: React.ReactNode }) {
  return (
    <div className="institute-shell mx-auto flex w-full max-w-7xl min-h-[calc(100vh-3.5rem)]">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card/50 md:block">
        <div className="sticky top-14 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Institutes
          </p>
          <ul className="space-y-0.5">
            {institutes.map((inst) => {
              const active = inst.id === instituteId;
              return (
                <li key={inst.id}>
                  <Link
                    href={`/institutes/${inst.id}`}
                    className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-foreground hover:bg-muted/80"
                    }`}
                  >
                    <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate">{inst.name}</span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        {ROLE_LABELS[inst.role] || inst.role}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {branches.length > 0 && (
            <>
              <p className="mb-2 mt-6 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Campuses
              </p>
              <ul className="space-y-0.5">
                {branches.map((branch) => {
                  const active = branch.id === selectedBranchId;
                  const href = searchParams
                    ? buildInstitutePathFromSearch(instituteId, searchParams, {
                        branch: branch.id,
                      })
                    : `/institutes/${instituteId}?branch=${branch.id}`;
                  return (
                    <li key={branch.id}>
                      <Link
                        href={href}
                        className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                          active
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0">
                          <span className="block truncate">{branch.name}</span>
                          <span className="text-[11px] font-normal">
                            {branch.teacherCount + branch.studentCount} people
                            {branch.isPrimary && " · Main"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {canManage && campusesTabHref && (
            <Link
              href={campusesTabHref}
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add campus
            </Link>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Mobile branch pills when sidebar is hidden */
export function BranchPills({
  instituteId,
  branches,
  selectedBranchId,
  searchParams,
  activeTab,
}: {
  instituteId: string;
  branches: InstituteSummary["branches"];
  selectedBranchId: string | null;
  searchParams: URLSearchParams;
  activeTab: InstituteTabId;
}) {
  if (branches.length <= 1) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
      {branches.map((branch) => {
        const href = buildInstitutePathFromSearch(instituteId, searchParams, {
          branch: branch.id,
          tab: activeTab,
        });
        return (
          <Link
            key={branch.id}
            href={href}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
              branch.id === selectedBranchId
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {branch.name}
          </Link>
        );
      })}
    </div>
  );
}
