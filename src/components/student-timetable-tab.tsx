"use client";

import { useEffect, useMemo, useState } from "react";
import { MemberTimetableView } from "@/components/member-timetable-view";
import type { Section } from "@/lib/api";

type Member = { userId: string; displayName?: string; username?: string; role?: string };

export function StudentTimetableTab({
  instituteId,
  studentId,
  enrolledSections,
}: {
  instituteId: string;
  studentId: string;
  enrolledSections: Section[];
}) {
  const [sections, setSections] = useState<Section[]>(enrolledSections);
  const [teachers, setTeachers] = useState<Member[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include", cache: "no-store" }),
      fetch(`/api/institutes/${instituteId}/members?group=staff`, { credentials: "include", cache: "no-store" }),
    ])
      .then(async ([sectionsRes, membersRes]) => {
        if (sectionsRes.ok) setSections(await sectionsRes.json());
        if (membersRes.ok) {
          const rows = (await membersRes.json()) as Member[];
          setTeachers(rows.filter((m) => m.role === "teacher" || m.role === "principal"));
        }
      })
      .catch(() => {});
  }, [instituteId]);

  const sectionOptions = useMemo(
    () =>
      sections.map((s) => ({
        id: s.id,
        label: `${s.className || "Class"} · ${s.name}`,
      })),
    [sections]
  );

  const teacherOptions = useMemo(
    () =>
      teachers.map((t) => ({
        id: t.userId,
        label: t.displayName || t.username || t.userId,
      })),
    [teachers]
  );

  const defaultSectionId = enrolledSections[0]?.id || sections[0]?.id || "";

  return (
    <MemberTimetableView
      instituteId={instituteId}
      role="student"
      userId={studentId}
      defaultSectionId={defaultSectionId}
      sections={sectionOptions}
      teachers={teacherOptions}
    />
  );
}
