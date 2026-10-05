"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ROLE_LABELS } from "@/lib/roles";
import { formatUserName } from "@/components/user-identity";
import type { Member, SectionSubject } from "@/lib/api";

type Section = { id: string; name: string; className?: string };
type SectionMapping = {
  teachers: Member[];
  students: Member[];
  subjects: (SectionSubject & { students?: { userId: string }[] })[];
};
type FilterMode = "section" | "class" | "teacher" | "student";
type EnrollmentModule = "subjects" | "teachers" | "students";

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
  const [staff, setStaff] = useState<Member[]>([]);
  const [students, setStudents] = useState<Member[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [mappings, setMappings] = useState<Record<string, SectionMapping>>({});
  const [sectionId, setSectionId] = useState("");
  const [userId, setUserId] = useState("");
  const [memberType, setMemberType] = useState<"teacher" | "student">("student");
  const [filterMode, setFilterMode] = useState<FilterMode>("section");
  const [filterValue, setFilterValue] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [module, setModule] = useState<EnrollmentModule>("subjects");
  const [selectedSectionId, setSelectedSectionId] = useState("");

  const load = useCallback(async () => {
    const [sectionRes, staffRes, studentRes, subjectRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/members?group=staff`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/members?group=students`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/subjects`, { credentials: "include" }),
    ]);
    const nextSections = sectionRes.ok ? await sectionRes.json() : [];
    setSections(nextSections);
    setSelectedSectionId((current) => current || nextSections[0]?.id || "");
    if (staffRes.ok) setStaff(await staffRes.json());
    if (studentRes.ok) setStudents(await studentRes.json());
    if (subjectRes.ok) setSubjects(await subjectRes.json());

    const rows = await Promise.all(nextSections.map(async (section: Section) => {
      const [overviewRes, subjectsRes] = await Promise.all([
        fetch(`/api/sections/${section.id}`, { credentials: "include" }),
        fetch(`/api/sections/${section.id}/subjects`, { credentials: "include" }),
      ]);
      const overview = overviewRes.ok ? await overviewRes.json() : {};
      const sectionSubjects = subjectsRes.ok ? await subjectsRes.json() : [];
      return [section.id, {
        teachers: overview.teachers ?? [],
        students: overview.students ?? [],
        subjects: sectionSubjects,
      }] as const;
    }));
    setMappings(Object.fromEntries(rows));
  }, [instituteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch(() => setMessage("Could not load enrollment details."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, refreshKey]);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionId || !userId) return;
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/sections/${sectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId, memberType }),
    });
    setLoading(false);
    if (res.ok) {
      setMessage("Assigned successfully.");
      await load();
      onChanged?.();
    } else {
      const data = await res.json();
      setMessage(data.detail || "Could not assign.");
    }
  }

  async function change(path: string, options: RequestInit = {}) {
    const res = await fetch(path, {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Request failed");
    await load();
  }

  async function update(path: string, body?: object) {
    try {
      await change(path, {
        method: body ? "POST" : "DELETE",
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update enrollment.");
    }
  }

  const roster =
    memberType === "teacher"
      ? staff.filter((m) => ["teacher", "lecturer", "professor", "principal", "admin"].includes(m.role))
      : students;
  const filterOptions = getFilterOptions(filterMode, sections, mappings);
  const matchingSections = sections.filter((section) => {
    if (!filterValue) return true;
    const mapping = mappings[section.id];
    if (filterMode === "section") return section.id === filterValue;
    if (filterMode === "class") return section.className === filterValue;
    if (filterMode === "teacher") return mapping?.teachers.some((member) => member.userId === filterValue);
    return mapping?.students.some((member) => member.userId === filterValue);
  });

  return (
    <section className="mt-6 space-y-6">
      <SectionFirstWorkspace
        sections={sections}
        staff={staff}
        students={students}
        subjects={subjects}
        mappings={mappings}
        selectedSectionId={selectedSectionId}
        setSelectedSectionId={setSelectedSectionId}
        module={module}
        setModule={setModule}
        update={update}
      />
      <div className="hidden">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Institute enrollment</p>
            <h2 className="mt-1 text-xl font-semibold">Build your academic roster</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Place teachers and students into sections, then connect subjects to their teachers.
            </p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-background/70 px-3 py-2 text-center">
            <p className="text-xl font-semibold">{sections.length}</p>
            <p className="text-[11px] text-muted-foreground">Sections</p>
          </div>
        </div>
        <form onSubmit={assign} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Section">
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.className || "No grade"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Role">
          <select
            value={memberType}
            onChange={(e) => {
              setMemberType(e.target.value as "teacher" | "student");
              setUserId("");
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </Field>
        <Field label="Person">
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select member</option>
            {roster.map((m) => (
              <option key={m.userId} value={m.userId}>
                {formatUserName(m)} ({ROLE_LABELS[m.role] || m.role})
              </option>
            ))}
          </select>
        </Field>
          <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          Assign
        </button>
        </form>
        {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
      </div>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Section assignments</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter the institute roster to focus on the records you need.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="View by">
              <select
                value={filterMode}
                onChange={(e) => {
                  setFilterMode(e.target.value as FilterMode);
                  setFilterValue("");
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="section">Section</option>
                <option value="class">Class / grade</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </Field>
            <Field label={`Select ${filterMode === "class" ? "class / grade" : filterMode}`}>
              <select
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">All {filterMode === "class" ? "classes" : `${filterMode}s`}</option>
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Showing {matchingSections.length} of {sections.length} sections
          </p>
        </div>
        {matchingSections.map((section) => (
          <SectionMappingCard
            key={section.id}
            section={section}
            mapping={mappings[section.id] ?? { teachers: [], students: [], subjects: [] }}
            subjects={subjects}
            staff={staff}
            update={update}
          />
        ))}
        {!matchingSections.length && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-medium">No matching enrollment records</p>
            <p className="mt-1 text-sm text-muted-foreground">Try another filter or assign members to a section.</p>
          </div>
        )}
      </div>
      </div>
    </section>
  );
}

function SectionMappingCard({
  section,
  mapping,
  subjects,
  staff,
  update,
}: {
  section: Section;
  mapping: SectionMapping;
  subjects: { id: string; name: string }[];
  staff: Member[];
  update: (path: string, body?: object) => void;
}) {
  const availableSubjects = subjects.filter(
    (subject) => !mapping.subjects.some((linked) => linked.id === subject.id)
  );
  const assignedTeacherIds = new Set(mapping.teachers.map((teacher) => teacher.userId));

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/30 px-4 py-4">
        <div>
          <h4 className="text-base font-semibold">{section.name}</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Class / grade: <span className="font-medium text-foreground">{section.className || "Not configured"}</span>
          </p>
        </div>
        <div className="flex gap-2 text-[11px]">
          <CountBadge label="Teachers" count={mapping.teachers.length} />
          <CountBadge label="Students" count={mapping.students.length} />
          <CountBadge label="Subjects" count={mapping.subjects.length} />
        </div>
      </div>
      <div className="p-4">
        <div className="grid gap-3 text-xs sm:grid-cols-2">
        <MemberList
          label="Teachers"
          members={mapping.teachers}
          remove={(id) => update(`/api/sections/${section.id}/members/${id}`)}
        />
        <MemberList
          label="Students"
          members={mapping.students}
          remove={(id) => update(`/api/sections/${section.id}/members/${id}`)}
        />
        </div>
        <div className="mt-5">
        <p className="text-xs text-muted-foreground">Subjects and subject teachers</p>
          <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              update(`/api/sections/${section.id}/subjects`, { subjectId: e.target.value });
              e.target.value = "";
            }
          }}
          className="mt-2 rounded-lg border border-border px-2 py-1.5 text-xs"
        >
          <option value="">Add subject…</option>
          {availableSubjects.map((subject) => (
            <option key={subject.id} value={subject.id}>{subject.name}</option>
          ))}
        </select>
          <div className="mt-3 space-y-2">
          {mapping.subjects.map((subject) => (
              <div key={subject.id} className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex justify-between text-sm font-medium">
                <span>{subject.name}</span>
                <button
                  type="button"
                  onClick={() => update(`/api/sections/${section.id}/subjects/${subject.id}`)}
                  className="text-xs text-destructive"
                >
                  Unlink
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {subject.teachers.map((teacher) => (
                  <span key={teacher.userId} className="rounded-full border border-border px-2 py-1">
                    {personName(staff, teacher.userId)}
                    <button
                      type="button"
                      onClick={() => update(`/api/sections/${section.id}/subjects/${subject.id}/teachers/${teacher.userId}`)}
                      className="ml-2 text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      update(`/api/sections/${section.id}/subjects/${subject.id}/teachers`, { userId: e.target.value });
                      e.target.value = "";
                    }
                  }}
                  className="rounded-lg border border-border px-2 py-1.5"
                >
                  <option value="">Assign teacher…</option>
                  {staff.filter((member) => assignedTeacherIds.has(member.userId)).map((member) => (
                    <option key={member.userId} value={member.userId}>{personName([member], member.userId)}</option>
                  ))}
                </select>
              </div>
              </div>
          ))}
          {!mapping.subjects.length && (
            <p className="text-xs text-muted-foreground">No subjects linked to this section.</p>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionFirstWorkspace({
  sections,
  staff,
  students,
  subjects,
  mappings,
  selectedSectionId,
  setSelectedSectionId,
  module,
  setModule,
  update,
}: {
  sections: Section[];
  staff: Member[];
  students: Member[];
  subjects: { id: string; name: string }[];
  mappings: Record<string, SectionMapping>;
  selectedSectionId: string;
  setSelectedSectionId: (id: string) => void;
  module: EnrollmentModule;
  setModule: (module: EnrollmentModule) => void;
  update: (path: string, body?: object) => void;
}) {
  const section = sections.find((item) => item.id === selectedSectionId);
  const mapping = section ? mappings[section.id] ?? { teachers: [], students: [], subjects: [] } : null;

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Enrollment</p>
          <h2 className="mt-1 text-xl font-semibold">Configure one class at a time</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a section, add its subjects, then assign teachers and students to each subject.
          </p>
        </div>
        <label className="min-w-56 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Class / section
          <select value={selectedSectionId} onChange={(event) => setSelectedSectionId(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">Select section</option>
            {sections.map((item) => <option key={item.id} value={item.id}>{item.className || "Class"} · {item.name}</option>)}
          </select>
        </label>
      </div>
      {section && mapping ? (
        <>
          <div className="mt-5 flex flex-wrap gap-2 border-b border-border pb-3">
            {([
              ["subjects", "1. Subjects"],
              ["teachers", "2. Teachers"],
              ["students", "3. Students"],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setModule(value)} className={`rounded-lg px-3 py-2 text-sm font-medium ${module === value ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>
          {module === "subjects" && (
            <SubjectModule section={section} mapping={mapping} subjects={subjects} update={update} />
          )}
          {module === "teachers" && (
            <TeacherModule section={section} mapping={mapping} staff={staff} update={update} />
          )}
          {module === "students" && (
            <StudentModule section={section} mapping={mapping} students={students} update={update} />
          )}
        </>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Create a class and section to begin enrollment.</p>
      )}
    </section>
  );
}

function SubjectModule({ section, mapping, subjects, update }: { section: Section; mapping: SectionMapping; subjects: { id: string; name: string }[]; update: (path: string, body?: object) => void }) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
      <div>
        <h3 className="font-semibold">Subjects available in the institute</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {subjects.map((subject) => {
            const assigned = mapping.subjects.some((item) => item.id === subject.id);
            return (
              <button key={subject.id} type="button" onClick={() => update(`/api/sections/${section.id}/subjects${assigned ? `/${subject.id}` : ""}`, assigned ? undefined : { subjectId: subject.id })} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm ${assigned ? "border-primary bg-primary/5 text-primary" : "border-border bg-background"}`}>
                <span>{subject.name}</span>
                <span className="text-xs">{assigned ? "Assigned" : "Add"}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-background/70 p-4">
        <h3 className="font-semibold">Subjects for {section.className || "class"} · {section.name}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {mapping.subjects.map((subject) => <span key={subject.id} className="rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary">{subject.name}</span>)}
          {!mapping.subjects.length && <p className="text-sm text-muted-foreground">No subjects assigned yet.</p>}
        </div>
      </div>
    </div>
  );
}

function TeacherModule({ section, mapping, staff, update }: { section: Section; mapping: SectionMapping; staff: Member[]; update: (path: string, body?: object) => void }) {
  return <AssignmentModule section={section} mapping={mapping} people={staff} type="teacher" update={update} />;
}

function StudentModule({ section, mapping, students, update }: { section: Section; mapping: SectionMapping; students: Member[]; update: (path: string, body?: object) => void }) {
  return <AssignmentModule section={section} mapping={mapping} people={students} type="student" update={update} />;
}

function AssignmentModule({ section, mapping, people, type, update }: { section: Section; mapping: SectionMapping; people: Member[]; type: "teacher" | "student"; update: (path: string, body?: object) => void }) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-muted-foreground">Assign {type === "teacher" ? "section teachers" : "section students"} to each enrolled subject.</p>
      {!mapping.subjects.length && <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Assign subjects first.</p>}
      {mapping.subjects.map((subject) => {
        const assignedIds = new Set(type === "teacher" ? subject.teachers.map((item) => item.userId) : (subject.students ?? []).map((item) => item.userId));
        const eligible = people.filter((person) => (type === "teacher" ? mapping.teachers : mapping.students).some((item) => item.userId === person.userId));
        return (
          <div key={subject.id} className="rounded-xl border border-border bg-background/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{subject.name}</h3>
              <select defaultValue="" onChange={(event) => { if (event.target.value) { update(`/api/sections/${section.id}/subjects/${subject.id}/${type === "teacher" ? "teachers" : "students"}`, { userId: event.target.value }); event.target.value = ""; } }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="">Add {type}</option>
                {eligible.filter((person) => !assignedIds.has(person.userId)).map((person) => <option key={person.userId} value={person.userId}>{formatUserName(person)}</option>)}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(type === "teacher" ? subject.teachers : subject.students ?? []).map((person) => (
                <span key={person.userId} className="rounded-full border border-border px-3 py-1.5 text-sm">
                  {personName(people, person.userId)}
                  <button type="button" onClick={() => update(`/api/sections/${section.id}/subjects/${subject.id}/${type === "teacher" ? "teachers" : "students"}/${person.userId}`)} className="ml-2 text-destructive">×</button>
                </span>
              ))}
              {!assignedIds.size && <span className="text-sm text-muted-foreground">None assigned</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CountBadge({ label, count }: { label: string; count: number }) {
  return (
    <span className="rounded-full border border-border bg-background px-2.5 py-1">
      <span className="font-semibold">{count}</span> {label}
    </span>
  );
}

function getFilterOptions(
  mode: FilterMode,
  sections: Section[],
  mappings: Record<string, SectionMapping>
) {
  if (mode === "section") {
    return sections.map((section) => ({
      value: section.id,
      label: `${section.name} · ${section.className || "No grade"}`,
    }));
  }
  if (mode === "class") {
    return [...new Set(sections.map((section) => section.className).filter((name): name is string => Boolean(name)))].map((name) => ({
      value: name,
      label: name,
    }));
  }

  const people = new Map<string, Member>();
  Object.values(mappings).forEach((mapping) => {
    (mode === "teacher" ? mapping.teachers : mapping.students).forEach((member) => {
      people.set(member.userId, member);
    });
  });
  return [...people.values()].map((member) => ({
    value: member.userId,
    label: formatUserName(member),
  }));
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function MemberList({
  label,
  members,
  remove,
}: {
  label: string;
  members: Member[];
  remove: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="font-semibold text-foreground">{label}</p>
      {members.length ? members.map((member) => (
        <div key={member.userId} className="mt-2 flex items-center justify-between rounded-lg bg-background px-2.5 py-2">
          <span>{formatUserName(member)}</span>
          <button type="button" onClick={() => remove(member.userId)} className="text-[11px] text-muted-foreground hover:text-destructive">
            Remove
          </button>
        </div>
      )) : <p className="mt-1 text-muted-foreground">None assigned</p>}
    </div>
  );
}

function personName(people: Member[], id: string) {
  const person = people.find((member) => member.userId === id);
  return person ? formatUserName(person) : id;
}
