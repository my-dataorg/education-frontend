"use client";

import { useEffect, useState } from "react";
import { DataTable, ModuleHeader, Panel } from "@/components/institute-tabs/module-tab-ui";

type RoleSettings = { principalCanEditTimetable: boolean };

const MATRIX = [
  ["Institute settings", "Yes", "Limited", "—", "—"],
  ["Invite / remove members", "Yes", "Yes", "—", "—"],
  ["Mark attendance", "Yes", "Yes", "Own class", "Own periods"],
  ["Enter marks", "Yes", "Yes", "Own class", "Own subject"],
  ["Post notices", "All", "All", "Own class", "—"],
] as const;

export function RolesSettingsTab({ instituteId }: { instituteId: string }) {
  const [settings, setSettings] = useState<RoleSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/role-settings`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load role settings");
        setSettings(await response.json());
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load"));
  }, [instituteId]);

  async function save(next: RoleSettings) {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/institutes/${instituteId}/role-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Could not save settings");
      setSaving(false);
      return;
    }
    setSettings(await response.json());
    setMessage("Settings saved");
    setSaving(false);
  }

  return (
    <section className="space-y-5">
      <ModuleHeader
        title="Roles & settings"
        description="Configure permissions for this institute"
      />
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
      )}
      <Panel title="Institute settings">
        {settings ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.principalCanEditTimetable}
              onChange={(event) => {
                const next = { principalCanEditTimetable: event.target.checked };
                setSettings(next);
                void save(next);
              }}
              disabled={saving}
            />
            Principal can edit timetable
          </label>
        ) : (
          <p className="text-sm text-muted-foreground">Loading settings…</p>
        )}
      </Panel>
      <Panel title="Permission matrix">
        <DataTable
          headers={["Capability", "Owner", "Admin", "Class teacher", "Subject teacher"]}
          rows={MATRIX.map((row) => [...row])}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Matrix reflects default role capabilities. Custom overrides will expand here later.
        </p>
      </Panel>
    </section>
  );
}
