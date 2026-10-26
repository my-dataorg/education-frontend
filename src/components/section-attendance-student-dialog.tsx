"use client";

import type { Member } from "@/lib/api";
import { UserIdentity } from "@/components/user-identity";
import { SectionStudentAttendanceView } from "@/components/section-student-attendance-view";

export function SectionAttendanceStudentDialog({
  sectionId,
  student,
  onClose,
}: {
  sectionId: string;
  student: Member;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <UserIdentity user={student} role="student" />
            <p className="mt-1 text-xs text-muted-foreground">Monthly attendance</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3">
          <SectionStudentAttendanceView sectionId={sectionId} studentUserId={student.userId} />
        </div>
      </div>
    </div>
  );
}
