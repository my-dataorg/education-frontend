"use client";

import { useEffect, useMemo, useState } from "react";
import { ROLE_LABELS } from "@/lib/roles";
import { formatUserName } from "@/components/user-identity";
import type { Branch, Member, Subject } from "@/lib/api";
import { TimetableManager } from "@/components/timetable-manager";
import { classSectionLabel } from "@/lib/utils";

type Section = {
  id: string;
  name: string;
  className?: string;
  classId?: string | null;
  gradeBand?: string;
  branchName?: string | null;
};
type AcademicClass = { id: string; name: string; gradeBand: string; sectionCount: number };

const BANDS = [
  { id: "primary", label: "Primary (1–5)" },
  { id: "middle", label: "Middle (6–8)" },
  { id: "high", label: "High (9–10)" },
] as const;

function sectionLabel(s: Section) {
  return classSectionLabel(s.className, s.name) || s.name;
}

export function EnrollmentManager({
  instituteId,
  refreshKey = 0,
  onChanged,
}: {
  instituteId: string;
  refreshKey?: number;
  onChanged?: () => void;
}) {
  const [sections, setSections] = useState<Section[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<Member[]>([]);
  const [students, setStudents] = useState<Member[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [userId, setUserId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [memberType, setMemberType] = useState<"teacher" | "student">("student");
  const [classId, setClassId] = useState("");
  const [className, setClassName] = useState("");
  const [gradeBand, setGradeBand] = useState("primary");
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sectionName, setSectionName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [teacherForSubjects, setTeacherForSubjects] = useState("");
  const [teacherSubjectIds, setTeacherSubjectIds] = useState<string[]>([]);
  const [teacherGradeBands, setTeacherGradeBands] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [subjectMessage, setSubjectMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingSubjects, setSavingSubjects] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/classes`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/members?group=staff`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/members?group=students`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/branches`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/subjects`, { credentials: "include" }),
    ]).then(async ([sRes, cRes, stRes, sdRes, bRes, subRes]) => {
      if (sRes.ok) {
        const data = await sRes.json();
        setSections(Array.isArray(data) ? data : []);
      }
      if (cRes.ok) {
        const data = await cRes.json();
        setClasses(Array.isArray(data) ? data : []);
      }
      if (stRes.ok) {
        const data = await stRes.json();
        setStaff(Array.isArray(data) ? data : []);
      }
      if (sdRes.ok) {
        const data = await sdRes.json();
        setStudents(Array.isArray(data) ? data : []);
      }
      if (bRes.ok) {
        const data = await bRes.json();
        setBranches(Array.isArray(data) ? data : []);
      }
      if (subRes.ok) {
        const data = await subRes.json();
        setSubjects(Array.isArray(data) ? data : []);
      }
    });
  }, [instituteId, refreshKey, reload]);

  const byClass = useMemo(() => {
    const map = new Map<string, { title: string; band?: string; items: Section[] }>();
    for (const cls of classes) {
      map.set(cls.id, {
        title: cls.name,
        band: cls.gradeBand,
        items: [],
      });
    }
    for (const s of sections) {
      const key = s.classId || s.className?.trim() || "Unnamed class";
      const group = map.get(key) ?? { title: s.className?.trim() || "Unnamed class", band: s.gradeBand, items: [] };
      group.items.push(s);
      map.set(key, group);
    }
    return [...map.entries()].sort((a, b) => a[1].title.localeCompare(b[1].title));
  }, [sections, classes]);

  async function createClassSection(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionName.trim()) return;
    if (!classId && !className.trim()) return;
    setCreating(true);
    setCreateMessage("");
    const url = classId
      ? `/api/institutes/${instituteId}/classes/${classId}/sections`
      : `/api/institutes/${instituteId}/sections`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: sectionName.trim(),
        className: className.trim(),
        gradeBand,
        branchId: branchId || null,
      }),
    });
    setCreating(false);
    if (res.ok) {
      setCreateMessage("Class and section created.");
      setSectionName("");
      setReload((n) => n + 1);
      onChanged?.();
    } else {
      const data = await res.json().catch(() => ({}));
      setCreateMessage(data.detail || "Could not create class/section.");
    }
  }

  async function createSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim()) return;
    setSubjectMessage("");
    const res = await fetch(`/api/institutes/${instituteId}/subjects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newSubject.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setNewSubject("");
      setReload((n) => n + 1);
      onChanged?.();
    } else {
      setSubjectMessage(data.detail || "Could not create subject.");
    }
  }

  async function saveTeacherSubjects(e: React.FormEvent) {
    e.preventDefault();
    if (!teacherForSubjects || teacherSubjectIds.length === 0 || teacherGradeBands.length === 0) return;
    setSavingSubjects(true);
    setSubjectMessage("");
    const [subRes, bandRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/members/${teacherForSubjects}/subjects`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subjectIds: teacherSubjectIds }),
      }),
      fetch(`/api/institutes/${instituteId}/members/${teacherForSubjects}/grade-bands`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gradeBands: teacherGradeBands }),
      }),
    ]);
    setSavingSubjects(false);
    if (subRes.ok && bandRes.ok) {
      setReload((n) => n + 1);
      onChanged?.();
    } else {
      const data = await (subRes.ok ? bandRes : subRes).json().catch(() => ({}));
      setSubjectMessage(data.detail || "Could not save teacher subjects or grade bands.");
    }
  }

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionId || !userId) return;
    if (memberType === "teacher" && !subjectId) return;
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/sections/${sectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        userId,
        memberType,
        subjectId: memberType === "teacher" ? subjectId : null,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setMessage("Assigned successfully.");
      onChanged?.();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.detail || "Could not assign.");
    }
  }

  const selectedSection = sections.find((s) => s.id === sectionId);
  const roster =
    memberType === "teacher"
      ? staff.filter((m) => {
          if (!["teacher", "lecturer", "professor", "principal", "admin"].includes(m.role)) return false;
          const band = selectedSection?.gradeBand;
          if (band && !(m.gradeBands || []).includes(band)) return false;
          return true;
        })
      : students;
  const selectedTeacher = staff.find((m) => m.userId === userId);
  const assignableSubjects = selectedTeacher?.subjects?.length
    ? subjects.filter((s) => selectedTeacher.subjects!.some((ts) => ts.id === s.id))
    : [];
  const teacherStaff = staff.filter((m) =>
    ["teacher", "lecturer", "professor", "principal", "admin", "owner"].includes(m.role)
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Create class and section</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Add a class for this institute, then a section under it (for example Grade 10, section A)
        </p>
        <form onSubmit={createClassSection} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">New class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {!classId && (
            <input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              required
              placeholder="Class name"
              className="rounded-lg border border-border px-3 py-2 text-sm"
            />
          )}
          {!classId && (
            <select
              value={gradeBand}
              onChange={(e) => setGradeBand(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              {BANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          )}
          <input
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            required
            placeholder="Section name"
            className="rounded-lg border border-border px-3 py-2 text-sm"
          />
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">Any campus</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
        {createMessage && <p className="mt-3 text-xs text-muted-foreground">{createMessage}</p>}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Subjects</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Create subjects, then give each teacher the subjects and grade bands they may teach
        </p>
        <form onSubmit={createSubject} className="mt-4 flex gap-3">
          <input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            required
            placeholder="Subject name"
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Add subject
          </button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          {subjects.length === 0 ? "No subjects yet." : subjects.map((s) => s.name).join(", ")}
        </p>
        <form onSubmit={saveTeacherSubjects} className="mt-4 grid gap-3 sm:grid-cols-2">
          <select
            value={teacherForSubjects}
            onChange={(e) => {
              const id = e.target.value;
              setTeacherForSubjects(id);
              const member = staff.find((m) => m.userId === id);
              setTeacherSubjectIds((member?.subjects || []).map((s) => s.id));
              setTeacherGradeBands(member?.gradeBands || []);
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">Select teacher</option>
            {teacherStaff.map((m) => (
              <option key={m.userId} value={m.userId}>
                {formatUserName(m)}
                {m.subjects?.length ? ` (${m.subjects.map((s) => s.name).join(", ")})` : ""}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2 rounded-lg border border-border px-3 py-2">
            {subjects.map((s) => (
              <label key={s.id} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={teacherSubjectIds.includes(s.id)}
                  onChange={(e) => {
                    setTeacherSubjectIds((ids) =>
                      e.target.checked ? [...ids, s.id] : ids.filter((id) => id !== s.id)
                    );
                  }}
                />
                {s.name}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 rounded-lg border border-border px-3 py-2 sm:col-span-2">
            {BANDS.map((b) => (
              <label key={b.id} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={teacherGradeBands.includes(b.id)}
                  onChange={(e) => {
                    setTeacherGradeBands((ids) =>
                      e.target.checked ? [...ids, b.id] : ids.filter((id) => id !== b.id)
                    );
                  }}
                />
                {b.label}
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={savingSubjects || !teacherForSubjects}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 sm:col-span-2"
          >
            {savingSubjects ? "Saving…" : "Save teacher subjects and grade bands"}
          </button>
        </form>
        {subjectMessage && <p className="mt-3 text-xs text-muted-foreground">{subjectMessage}</p>}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Classes</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Sections grouped by class</p>
        {byClass.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No classes yet. Create one above.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {byClass.map(([key, group]) => (
              <li key={key} className="rounded-lg border border-border px-3 py-2">
                <p className="text-sm font-medium">
                  Class : {group.title}
                  {group.band
                    ? ` · ${BANDS.find((b) => b.id === group.band)?.label || group.band}`
                    : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {group.items.length
                    ? group.items.map((s) => `Section : ${s.name}`).join(", ")
                    : "No sections yet"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Assign to section</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Assign a teacher to one subject in a section (only teachers for that grade band), or enroll a student
        </p>
        <form onSubmit={assign} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={sectionId}
            onChange={(e) => {
              setSectionId(e.target.value);
              setUserId("");
            }}
            required
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">Select section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {sectionLabel(s)}
              </option>
            ))}
          </select>
          <select
            value={memberType}
            onChange={(e) => {
              setMemberType(e.target.value as "teacher" | "student");
              setUserId("");
              setSubjectId("");
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
          <select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setSubjectId("");
            }}
            required
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">Select member</option>
            {roster.map((m) => (
              <option key={m.userId} value={m.userId}>
                {formatUserName(m)} ({ROLE_LABELS[m.role] || m.role})
              </option>
            ))}
          </select>
          {memberType === "teacher" && (
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="">Select subject</option>
              {assignableSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Assign
          </button>
        </form>
        {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
      </section>

      <TimetableManager
        instituteId={instituteId}
        sections={sections}
        staff={staff}
        subjects={subjects}
        refreshKey={reload + refreshKey}
      />
    </div>
  );
}
