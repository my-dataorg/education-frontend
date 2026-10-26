"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUserName } from "@/components/user-identity";
import type { Member } from "@/lib/api";
import {
  AssignedGroup,
  PersonRow,
  SectionAssignmentShell,
} from "@/components/section-assignment-shell";
import { SectionMemberPickerDialog } from "@/components/section-member-picker-dialog";

type RosterTab = "teachers" | "students";

export function SectionRosterPanel({
  instituteId,
  sectionId,
  sectionLabel,
  canManage,
  classTeacherUserId,
  onRosterChanged,
  fillHeight = false,
}: {
  instituteId: string;
  sectionId: string;
  sectionLabel: string;
  canManage: boolean;
  classTeacherUserId?: string | null;
  onRosterChanged?: () => void;
  fillHeight?: boolean;
}) {
  const [teachers, setTeachers] = useState<Member[]>([]);
  const [students, setStudents] = useState<Member[]>([]);
  const [staff, setStaff] = useState<Member[]>([]);
  const [allStudents, setAllStudents] = useState<Member[]>([]);
  const [classTeacher, setClassTeacher] = useState(classTeacherUserId ?? "");
  const [activeTab, setActiveTab] = useState<RosterTab>("teachers");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [overviewRes, staffRes, studentRes] = await Promise.all([
      fetch(`/api/sections/${sectionId}`, { credentials: "include", cache: "no-store" }),
      fetch(`/api/institutes/${instituteId}/members?group=staff`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/members?group=students`, { credentials: "include" }),
    ]);
    if (overviewRes.ok) {
      const overview = await overviewRes.json();
      setTeachers(overview.teachers ?? []);
      setStudents(overview.students ?? []);
      setClassTeacher(overview.classTeacherUserId ?? "");
    }
    if (staffRes.ok) setStaff(await staffRes.json());
    if (studentRes.ok) setAllStudents(await studentRes.json());
  }, [instituteId, sectionId]);

  useEffect(() => {
    load().catch(() => setError("Could not load class roster."));
  }, [load]);

  const teachingStaff = useMemo(
    () =>
      staff.filter((p) =>
        ["teacher", "lecturer", "professor", "principal"].includes(p.role)
      ),
    [staff]
  );

  const teacherIds = useMemo(() => new Set(teachers.map((t) => t.userId)), [teachers]);
  const studentIds = useMemo(() => new Set(students.map((s) => s.userId)), [students]);

  async function bulkAssign(userIds: string[], kind: RosterTab) {
    const memberType = kind === "students" ? "student" : "teacher";
    let ok = 0;
    let lastError = "";
    for (const userId of userIds) {
      const res = await fetch(`/api/sections/${sectionId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, memberType }),
      });
      if (res.ok) ok += 1;
      else {
        const body = await res.json().catch(() => ({}));
        lastError = body.detail || "Could not assign";
      }
    }
    if (!ok) throw new Error(lastError || "Could not assign selected members.");
    if (ok < userIds.length) {
      throw new Error(`Assigned ${ok} of ${userIds.length}. ${lastError}`);
    }
    await load();
    onRosterChanged?.();
  }

  async function remove(userId: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/sections/${sectionId}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Could not remove");
      }
      await load();
      onRosterChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  async function saveClassTeacher(userId: string) {
    if (!canManage) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/institutes/${instituteId}/sections/${sectionId}/class-teacher`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userId || null }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Could not update class teacher");
      }
      setClassTeacher(userId);
      onRosterChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update class teacher");
    } finally {
      setBusy(false);
    }
  }

  const tabBar = (
    <div className="flex w-full rounded-lg border border-border p-0.5 text-sm sm:max-w-md">
      <button
        type="button"
        onClick={() => setActiveTab("teachers")}
        className={`flex-1 rounded-md px-2 py-2 font-medium transition ${
          activeTab === "teachers" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        Teachers ({teachers.length})
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("students")}
        className={`flex-1 rounded-md px-2 py-2 font-medium transition ${
          activeTab === "students" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        Students ({students.length})
      </button>
    </div>
  );

  const assignedBlock = (
    <div className={fillHeight ? "flex min-h-0 flex-1 flex-col overflow-hidden" : undefined}>
      {activeTab === "teachers" && canManage && (
        <div className="mb-4 shrink-0 rounded-lg border border-border bg-muted/20 px-3 py-3">
          <label className="text-xs font-semibold text-muted-foreground" htmlFor="class-teacher">
            Class teacher
          </label>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Assign subject teachers on the Subjects tab so they can update the class board for {sectionLabel}.
          </p>
          <select
            id="class-teacher"
            disabled={busy || !teachers.length}
            value={classTeacher || ""}
            onChange={(e) => void saveClassTeacher(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
          >
            <option value="">
              {teachers.length ? "Not set" : "Assign a teacher first"}
            </option>
            {teachers.map((t) => (
              <option key={t.userId} value={t.userId}>{formatUserName(t)}</option>
            ))}
          </select>
        </div>
      )}

      {activeTab === "teachers" ? (
        <AssignedGroup
          label="Teachers"
          count={teachers.length}
          empty="No teachers assigned to this class yet."
          scrollable
          fillRemaining={fillHeight}
        >
          {teachers.map((m) => (
            <PersonRow
              key={m.userId}
              userId={m.userId}
              name={formatUserName(m)}
              subtitle={m.email || undefined}
              onRemove={canManage ? () => void remove(m.userId) : undefined}
            />
          ))}
        </AssignedGroup>
      ) : (
        <AssignedGroup
          label="Students"
          count={students.length}
          empty="No students assigned to this class yet."
          scrollable
          fillRemaining={fillHeight}
        >
          {students.map((m) => (
            <PersonRow
              key={m.userId}
              userId={m.userId}
              name={formatUserName(m)}
              subtitle={m.email || undefined}
              onRemove={canManage ? () => void remove(m.userId) : undefined}
            />
          ))}
        </AssignedGroup>
      )}
    </div>
  );

  const addLabel = activeTab === "students" ? "Add students" : "Add teachers";

  return (
    <div className={fillHeight ? "flex min-h-0 flex-1 flex-col overflow-hidden" : undefined}>
      <SectionAssignmentShell
        canManage={canManage}
        error={error}
        assigned={assignedBlock}
        fillHeight={fillHeight}
        tabs={tabBar}
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {addLabel}
            </button>
          ) : undefined
        }
      />

      {canManage && (
        <SectionMemberPickerDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          kind={activeTab}
          sectionLabel={sectionLabel}
          candidates={activeTab === "students" ? allStudents : teachingStaff}
          assignedIds={activeTab === "students" ? studentIds : teacherIds}
          onConfirm={(userIds) => bulkAssign(userIds, activeTab)}
        />
      )}
    </div>
  );
}
