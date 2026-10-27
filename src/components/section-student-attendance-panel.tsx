"use client";

import { useEffect, useState } from "react";
import { SectionStudentAttendanceView } from "@/components/section-student-attendance-view";

export function SectionStudentAttendancePanel({
  sectionId,
  sectionLabel,
  fillHeight = false,
}: {
  sectionId: string;
  sectionLabel: string;
  fillHeight?: boolean;
}) {
  const [userId, setUserId] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => setUserId(session?.user?.id ?? ""))
      .catch(() => setUserId(""))
      .finally(() => setLoadingSession(false));
  }, []);

  return (
    <div
      className={
        fillHeight
          ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card p-4"
          : "rounded-xl border border-border bg-card p-4"
      }
    >
      <header className="mb-3 shrink-0">
        <h2 className="text-lg font-semibold">My attendance</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Read-only record for {sectionLabel}. Choose a subject to see each teacher&apos;s register.
          Submitted days only (drafts are hidden).
        </p>
      </header>

      {loadingSession && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loadingSession && !userId && (
        <p className="text-sm text-muted-foreground">Sign in again to view your attendance.</p>
      )}
      {!loadingSession && userId && (
        <div className={fillHeight ? "min-h-0 flex-1 overflow-y-auto" : undefined}>
          <SectionStudentAttendanceView sectionId={sectionId} studentUserId={userId} />
        </div>
      )}
    </div>
  );
}
