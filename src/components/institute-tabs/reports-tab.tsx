"use client";

import { useState } from "react";
import { ModuleHeader, Panel } from "@/components/institute-tabs/module-tab-ui";

const REPORTS = [
  { type: "attendance", title: "Attendance report", description: "Class-wise attendance for the selected month." },
  { type: "enrollment", title: "Enrollment report", description: "Students per class and section." },
] as const;

export function ReportsTab({
  instituteId,
  branchId,
}: {
  instituteId: string;
  branchId?: string | null;
}) {
  const [error, setError] = useState("");
  const [loadingType, setLoadingType] = useState("");

  async function download(reportType: string) {
    setLoadingType(reportType);
    setError("");
    const params = new URLSearchParams();
    if (branchId) params.set("branch", branchId);
    const response = await fetch(
      `/api/institutes/${instituteId}/reports/${reportType}?${params.toString()}`,
      { credentials: "include" }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Export failed. Try again.");
      setLoadingType("");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setLoadingType("");
  }

  return (
    <section className="space-y-5">
      <ModuleHeader
        title="Reports"
        description="Review attendance, academic performance, and enrollment"
      />
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((report) => (
          <Panel key={report.type} title={report.title}>
            <p className="text-sm text-muted-foreground">{report.description}</p>
            <button
              type="button"
              disabled={loadingType === report.type}
              onClick={() => void download(report.type)}
              className="mt-4 rounded-lg border border-border px-3 py-2 text-xs font-medium disabled:opacity-50"
            >
              {loadingType === report.type ? "Preparing…" : "Download CSV"}
            </button>
          </Panel>
        ))}
      </div>
    </section>
  );
}
