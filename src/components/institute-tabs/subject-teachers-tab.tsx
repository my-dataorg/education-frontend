"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUserName } from "@/components/user-identity";
import type { Member, Section, SectionSubject } from "@/lib/api";

type SectionData = {
  section: Section;
  teachers: Member[];
  subjects: SectionSubject[];
};

export function SubjectTeachersTab({ instituteId }: { instituteId: string }) {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [staff, setStaff] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sectionsRes, staffRes] = await Promise.all([
        fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" }),
        fetch(`/api/institutes/${instituteId}/members?group=staff`, { credentials: "include" }),
      ]);
      if (!sectionsRes.ok || !staffRes.ok) throw new Error("Could not load subject teachers.");

      const nextSections = (await sectionsRes.json()) as Section[];
      const nextStaff = (await staffRes.json()) as Member[];
      const data = await Promise.all(nextSections.map(async (section) => {
        const [overviewRes, subjectsRes] = await Promise.all([
          fetch(`/api/sections/${section.id}`, { credentials: "include" }),
          fetch(`/api/sections/${section.id}/subjects`, { credentials: "include" }),
        ]);
        if (!overviewRes.ok || !subjectsRes.ok) throw new Error("Could not load subject mappings.");
        const overview = await overviewRes.json();
        return {
          section,
          teachers: overview.teachers ?? [],
          subjects: await subjectsRes.json(),
        };
      }));

      const sortedSections = sortSections(data);
      setSections(sortedSections);
      setStaff(nextStaff);
      setSelectedSectionId((current) => current || sortedSections[0]?.section.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load subject teachers.");
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selected = sections.find(({ section }) => section.id === selectedSectionId);
  const teachers = useMemo(
    () => selected?.teachers.map((teacher) => findMember(staff, teacher.userId) ?? teacher) ?? [],
    [selected, staff]
  );

  const activeSubjectId = selected?.subjects.some((subject) => subject.id === selectedSubjectId)
    ? selectedSubjectId
    : selected?.subjects[0]?.id || "";

  async function assign(subjectId: string, teacherId: string) {
    if (!selected || saving) return;
    const subject = selected.subjects.find((item) => item.id === subjectId);
    if (!subject || subject.teachers.some((teacher) => teacher.userId === teacherId)) return;

    setSaving(`${subjectId}:${teacherId}`);
    setError("");
    try {
      const response = await fetch(
        `/api/sections/${selected.section.id}/subjects/${subjectId}/teachers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId: teacherId }),
        }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || "Could not assign teacher.");
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not assign teacher.");
    } finally {
      setSaving("");
    }
  }

  async function remove(subjectId: string, teacherId: string) {
    if (!selected || saving) return;
    setSaving(`${subjectId}:${teacherId}`);
    setError("");
    try {
      const response = await fetch(
        `/api/sections/${selected.section.id}/subjects/${subjectId}/teachers/${teacherId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!response.ok) throw new Error("Could not remove teacher.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove teacher.");
    } finally {
      setSaving("");
    }
  }

  if (loading) return <p className="mt-6 text-sm text-muted-foreground">Loading subject teachers...</p>;
  if (error && !sections.length) {
    return <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  }

  return (
    <section className="mt-6 space-y-4">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-[190px_minmax(300px,1fr)_250px]">
        <div className="space-y-2">
          <h2 className="px-2 text-sm font-semibold">Classes</h2>
          {sections.map(({ section, subjects }) => (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                setSelectedSectionId(section.id);
                setSelectedSubjectId(subjects[0]?.id || "");
              }}
              className={`w-full rounded-xl border p-3 text-left ${
                section.id === selectedSectionId ? "border-primary bg-primary/10" : "border-border bg-background"
              }`}
            >
              <p className="font-semibold">{section.className || "Class"} · {section.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{subjects.length} subjects</p>
            </button>
          ))}
          {!sections.length && <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No classes configured.</p>}
        </div>

        <div className="min-h-96 rounded-xl border-2 border-dashed border-border bg-muted/10 p-4">
          {selected ? (
            <>
              <h2 className="text-xl font-semibold">{selected.section.className || "Class"} · {selected.section.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Drop a teacher on a subject to assign them.</p>
              <div className="mt-5 space-y-3">
                {selected.subjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    saving={saving}
                    staff={staff}
                    onDrop={(teacherId) => void assign(subject.id, teacherId)}
                    onRemove={(teacherId) => void remove(subject.id, teacherId)}
                    selected={subject.id === activeSubjectId}
                    onSelect={() => setSelectedSubjectId(subject.id)}
                  />
                ))}
                {!selected.subjects.length && <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No subjects are linked to this class yet.</p>}
              </div>
            </>
          ) : <p className="text-sm text-muted-foreground">Select a class to begin.</p>}
        </div>

        <div className="space-y-2">
          <h2 className="px-2 text-sm font-semibold">Section teachers</h2>
          {teachers.map((teacher) => (
            <div
              key={teacher.userId}
              draggable={!saving}
              onDragStart={(event) => event.dataTransfer.setData("teacherId", teacher.userId)}
              className="flex cursor-grab items-center justify-between rounded-xl border border-border bg-background p-3 text-sm"
            >
              <span className="truncate">{formatUserName(teacher)}</span>
              <span className="ml-2 text-xs text-muted-foreground">Drag</span>
              <button
                type="button"
                disabled={!activeSubjectId || Boolean(saving)}
                onClick={() => void assign(activeSubjectId, teacher.userId)}
                className="rounded-lg border border-border px-2 py-1 text-base leading-none disabled:opacity-40"
                aria-label={`Assign ${formatUserName(teacher)} to selected subject`}
              >
                +
              </button>
            </div>
          ))}
          {!teachers.length && <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Assign teachers to this section first.</p>}
        </div>
      </div>
    </section>
  );
}

function SubjectCard({
  subject,
  staff,
  saving,
  onDrop,
  onRemove,
  selected,
  onSelect,
}: {
  subject: SectionSubject;
  staff: Member[];
  saving: string;
  onDrop: (teacherId: string) => void;
  onRemove: (teacherId: string) => void;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        const teacherId = event.dataTransfer.getData("teacherId");
        if (teacherId) onDrop(teacherId);
      }}
      onClick={onSelect}
      className={`rounded-xl border bg-background p-4 ${selected ? "border-primary ring-1 ring-primary/30" : "border-border"}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{subject.name}</h3>
        <span className="text-xs text-muted-foreground">{subject.teachers.length} assigned</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {subject.teachers.map((teacher) => (
          <span key={teacher.userId} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
            {formatUserName(findMember(staff, teacher.userId) ?? teacher)}
            <button
              type="button"
              disabled={Boolean(saving)}
              onClick={() => onRemove(teacher.userId)}
              className="text-destructive disabled:opacity-50"
              aria-label={`Remove ${formatUserName(findMember(staff, teacher.userId) ?? teacher)}`}
            >
              ×
            </button>
          </span>
        ))}
        {!subject.teachers.length && <p className="text-sm text-muted-foreground">Drop a teacher here.</p>}
      </div>
    </div>
  );
}

function findMember(members: Member[], userId: string) {
  return members.find((member) => member.userId === userId);
}

function sortSections(data: SectionData[]) {
  return [...data].sort((a, b) => {
    const grade = Number(a.section.className) - Number(b.section.className);
    if (!Number.isNaN(grade) && grade !== 0) return grade;
    return `${a.section.className}-${a.section.name}`.localeCompare(`${b.section.className}-${b.section.name}`);
  });
}
