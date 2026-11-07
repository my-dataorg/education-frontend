"use client";

import { useMemo, useState } from "react";
import { ModuleHeader } from "@/components/institute-tabs/module-tab-ui";
import { FeesTab } from "@/components/institute-tabs/fees-tab";
import { FinanceExpensesPanel } from "@/components/institute-tabs/finance-expenses-panel";
import { INSTITUTE_ADMIN_ROLES } from "@/lib/roles";

type PanelId = "students" | "staff" | "institute";

export function FinanceTab({ instituteId, role }: { instituteId: string; role: string }) {
  const isManage = INSTITUTE_ADMIN_ROLES.has(role) || role === "principal";
  const isTeacher = ["teacher", "lecturer", "professor"].includes(role);
  const defaultPanel: PanelId = isTeacher && !isManage ? "staff" : "students";
  const [panel, setPanel] = useState<PanelId>(defaultPanel);

  const tabs = useMemo(() => {
    if (isTeacher && !isManage) return [{ id: "staff" as const, label: "My pay" }];
    return [
      { id: "students" as const, label: "Students" },
      { id: "staff" as const, label: "Staff pay" },
      { id: "institute" as const, label: "Institute costs" },
    ];
  }, [isManage, isTeacher]);

  return (
    <section className="space-y-5">
      <ModuleHeader
        title="Finance"
        description="Student collections, staff pay, and institute expenses"
      />
      <div className="flex flex-wrap gap-4 border-b border-border text-xs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPanel(t.id)}
            className={`border-b-2 pb-2.5 ${
              panel === t.id
                ? "border-primary font-semibold text-foreground"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {panel === "students" && isManage && <FeesTab instituteId={instituteId} />}
      {panel === "staff" && (
        <FinanceExpensesPanel
          instituteId={instituteId}
          category="staff"
          canManage={isManage}
          teacherOnly={isTeacher && !isManage}
        />
      )}
      {panel === "institute" && isManage && (
        <FinanceExpensesPanel instituteId={instituteId} category="institute" canManage />
      )}
    </section>
  );
}
