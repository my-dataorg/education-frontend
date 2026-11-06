"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  CONFIG_MATRIX_CLASS_TAB_IDS,
  CONFIG_MATRIX_SIDEBAR_IDS,
  labelForConfigFeature,
  NAV_ACCESS_MATRIX_ROLES,
} from "@/lib/education-nav-config-labels";
import type { NavAccessOverrides } from "@/lib/nav-access";
import { ModuleHeader, Panel } from "@/components/institute-tabs/module-tab-ui";
import { cn } from "@/lib/utils";

type MatrixResponse = {
  featureIds: string[];
  roles: string[];
  overrides: NavAccessOverrides;
};

function ruleFor(
  overrides: NavAccessOverrides,
  featureId: string,
  role: string
): { visible: boolean; editable: boolean } {
  const r = overrides[featureId]?.[role];
  return {
    visible: r?.visible !== false,
    editable: r?.editable !== false,
  };
}

function AccessCells({
  featureId,
  overrides,
  setRule,
  parentNavId,
}: {
  featureId: string;
  overrides: NavAccessOverrides;
  setRule: (featureId: string, role: string, patch: Partial<{ visible: boolean; editable: boolean }>) => void;
  /** When parent sidebar Show is off, nest rows are N/A — gray out and disable. */
  parentNavId?: string;
}) {
  return (
    <>
      {NAV_ACCESS_MATRIX_ROLES.map((role) => {
        const rule = ruleFor(overrides, featureId, role);
        const parentHidden =
          parentNavId != null && !ruleFor(overrides, parentNavId, role).visible;
        const showDisabled = parentHidden;
        const editDisabled = parentHidden || !rule.visible;
        return (
          <td
            key={role}
            className={cn("px-2 py-2 align-top", parentHidden && "opacity-45")}
            title={
              parentHidden
                ? "Turn on Show for Classes above to configure these tabs."
                : undefined
            }
          >
            <label className={cn("flex items-center gap-1", parentHidden && "cursor-not-allowed")}>
              <input
                type="checkbox"
                checked={rule.visible}
                disabled={showDisabled}
                onChange={(e) => setRule(featureId, role, { visible: e.target.checked })}
              />
              Show
            </label>
            <label
              className={cn(
                "mt-1 flex items-center gap-1 text-muted-foreground",
                parentHidden && "cursor-not-allowed"
              )}
            >
              <input
                type="checkbox"
                checked={rule.editable}
                disabled={editDisabled}
                onChange={(e) => setRule(featureId, role, { editable: e.target.checked })}
              />
              Edit
            </label>
          </td>
        );
      })}
    </>
  );
}

export function FeatureAccessTab({ instituteId }: { instituteId: string }) {
  const [overrides, setOverrides] = useState<NavAccessOverrides>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [classesExpanded, setClassesExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/institutes/${instituteId}/nav-access/matrix`, {
      credentials: "include",
    });
    if (!response.ok) {
      setError(response.status === 403 ? "Owner access required" : "Could not load config");
      setLoading(false);
      return;
    }
    const body = (await response.json()) as MatrixResponse;
    setOverrides(body.overrides ?? {});
    setLoading(false);
  }, [instituteId]);

  useEffect(() => {
    void load();
  }, [load]);

  function setRule(featureId: string, role: string, patch: Partial<{ visible: boolean; editable: boolean }>) {
    setOverrides((prev) => {
      const next = { ...prev };
      const byRole = { ...(next[featureId] ?? {}) };
      const current = ruleFor(prev, featureId, role);
      byRole[role] = { ...current, ...patch };
      next[featureId] = byRole;
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    const compact: NavAccessOverrides = {};
    for (const [featureId, byRole] of Object.entries(overrides)) {
      for (const [role, rule] of Object.entries(byRole ?? {})) {
        if (rule.visible === false || rule.editable === false) {
          compact[featureId] ??= {};
          compact[featureId][role] = {
            ...(rule.visible === false ? { visible: false } : {}),
            ...(rule.editable === false ? { editable: false } : {}),
          };
        }
      }
    }
    const response = await fetch(`/api/institutes/${instituteId}/nav-access/matrix`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ overrides: compact }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not save");
      setSaving(false);
      return;
    }
    const body = (await response.json()) as MatrixResponse;
    setOverrides(body.overrides ?? {});
    setMessage("Saved — sidebar updates on next navigation.");
    setSaving(false);
  }

  return (
    <section className="space-y-5">
      <ModuleHeader
        title="Config"
        description="Choose which sidebar features each role sees and whether they can edit or view only. Expand Classes to configure tabs inside the class workspace."
      />
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      )}
      <Panel title="Feature access">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Empty cells use the app default for that role. Uncheck Show to hide; uncheck Edit for view-only where the screen supports it.
              When <strong>Classes</strong> Show is off for a role, sub-tabs under Classes are disabled for that role until you turn Classes back on.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-semibold">Feature</th>
                    {NAV_ACCESS_MATRIX_ROLES.map((role) => (
                      <th key={role} className="px-2 py-2 font-semibold capitalize">
                        {role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CONFIG_MATRIX_SIDEBAR_IDS.map((featureId) => (
                    <Fragment key={featureId}>
                      <tr className="border-b border-border/60">
                        <td className="py-2 pr-3 font-medium">
                          {featureId === "classes" ? (
                            <button
                              type="button"
                              onClick={() => setClassesExpanded((e) => !e)}
                              className="inline-flex items-center gap-1.5 text-left font-medium hover:text-foreground"
                            >
                              {classesExpanded ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              {labelForConfigFeature(featureId)}
                            </button>
                          ) : (
                            labelForConfigFeature(featureId)
                          )}
                        </td>
                        <AccessCells featureId={featureId} overrides={overrides} setRule={setRule} />
                      </tr>
                      {featureId === "classes" && classesExpanded
                        ? CONFIG_MATRIX_CLASS_TAB_IDS.map((tabId) => (
                            <tr key={tabId} className="border-b border-border/40 bg-muted/20">
                              <td className="py-2 pr-3 pl-8 text-muted-foreground">
                                {labelForConfigFeature(tabId)}
                              </td>
                              <AccessCells
                                featureId={tabId}
                                overrides={overrides}
                                setRule={setRule}
                                parentNavId="classes"
                              />
                            </tr>
                          ))
                        : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save config"}
            </button>
          </>
        )}
      </Panel>
    </section>
  );
}
