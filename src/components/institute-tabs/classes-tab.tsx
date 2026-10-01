"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import type { InstituteSummary, Member, Section, SectionSubject, Subject } from "@/lib/api";

type Props = { instituteId: string; branches: InstituteSummary["branches"] };

export function ClassesTab({ instituteId, branches }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<Member[]>([]);
  const [students, setStudents] = useState<Member[]>([]);
  const [linked, setLinked] = useState<Record<string, SectionSubject[]>>({});
  const [members, setMembers] = useState<Record<string, { teachers: string[]; students: string[] }>>({});
  const [subjectName, setSubjectName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [className, setClassName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [sectionRes, subjectRes, staffRes, studentRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/sections`),
      fetch(`/api/institutes/${instituteId}/subjects`),
      fetch(`/api/institutes/${instituteId}/members?group=staff`),
      fetch(`/api/institutes/${instituteId}/members?group=students`),
    ]);
    const [nextSections, nextSubjects, nextStaff, nextStudents] = await Promise.all([
      sectionRes.json(), subjectRes.json(), staffRes.json(), studentRes.json(),
    ]);
    setSections(nextSections);
    setSubjects(nextSubjects);
    setStaff(nextStaff);
    setStudents(nextStudents);
    const subjectRows = await Promise.all(nextSections.map(async (s: Section) => [
      s.id, await (await fetch(`/api/sections/${s.id}/subjects`)).json(),
    ] as const));
    setLinked(Object.fromEntries(subjectRows));
    const memberRows = await Promise.all(nextSections.map(async (s: Section) => {
      const overview = await (await fetch(`/api/sections/${s.id}`)).json();
      return [s.id, {
        teachers: (overview.teachers ?? []).map((m: Member) => m.userId),
        students: (overview.students ?? []).map((m: Member) => m.userId),
      }] as const;
    }));
    setMembers(Object.fromEntries(memberRows));
  }, [instituteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load classes"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function change(path: string, options: RequestInit = {}) {
    const res = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
    if (!res.ok) throw new Error((await res.json()).detail || "Request failed");
  }

  async function createSubject() {
    if (!subjectName.trim()) return;
    try { await change(`/api/institutes/${instituteId}/subjects`, { method: "POST", body: JSON.stringify({ name: subjectName }) }); setSubjectName(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not create subject"); }
  }

  async function createSection() {
    if (!sectionName.trim()) return;
    try {
      await change(`/api/institutes/${instituteId}/sections`, { method: "POST", body: JSON.stringify({ name: sectionName, className, branchId: branches[0]?.id || null }) });
      setSectionName(""); setClassName(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create class"); }
  }

  async function updateSection(sectionId: string, path: string, body?: object) {
    try { await change(path, { method: body ? "POST" : "DELETE", body: body ? JSON.stringify(body) : undefined }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update class"); }
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <FormCard title="Subjects">
          <div className="flex gap-2">
            <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Subject name" className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm" />
            <button onClick={createSubject} className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Add</button>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {subjects.map((s) => <li key={s.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">{s.name}<button onClick={() => updateSection("", `/api/institutes/${instituteId}/subjects/${s.id}`)} className="text-xs text-destructive">Delete</button></li>)}
          </ul>
        </FormCard>
        <FormCard title="New class">
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="Section name" className="rounded-lg border border-border px-3 py-2 text-sm" />
            <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Class / grade" className="rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <button onClick={createSection} className="mt-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Create class</button>
        </FormCard>
      </div>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Classes and subjects</h2>
        {sections.map((section) => <SectionCard key={section.id} section={section} subjects={subjects} linked={linked[section.id] ?? []} staff={staff} students={students} members={members[section.id] ?? { teachers: [], students: [] }} update={(path, body) => updateSection(section.id, path, body)} />)}
        {!sections.length && <p className="text-sm text-muted-foreground">No classes yet.</p>}
      </div>
    </div>
  );
}

function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-4 shadow-sm"><h3 className="mb-3 font-semibold">{title}</h3>{children}</section>;
}

function SectionCard({ section, subjects, linked, staff, students, members, update }: { section: Section; subjects: Subject[]; linked: SectionSubject[]; staff: Member[]; students: Member[]; members: { teachers: string[]; students: string[] }; update: (path: string, body?: object) => void }) {
  const available = subjects.filter((s) => !linked.some((item) => item.id === s.id));
  return <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
    <h3 className="font-semibold">{section.name} <span className="font-normal text-muted-foreground">{section.className}</span></h3>
    <div className="mt-3 flex flex-wrap gap-2">
      <select defaultValue="" onChange={(e) => { if (e.target.value) update(`/api/sections/${section.id}/subjects`, { subjectId: e.target.value }); e.target.value = ""; }} className="rounded-lg border border-border px-2 py-2 text-sm"><option value="">Link subject…</option>{available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <MemberSelect label="Add teacher…" options={staff} onSelect={(userId) => update(`/api/sections/${section.id}/members`, { userId, memberType: "teacher" })} />
      <MemberSelect label="Add student…" options={students} onSelect={(userId) => update(`/api/sections/${section.id}/members`, { userId, memberType: "student" })} />
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {linked.map((subject) => <div key={subject.id} className="rounded-lg border border-border p-3">
        <div className="flex justify-between text-sm font-medium"><span>{subject.name}</span><button onClick={() => update(`/api/sections/${section.id}/subjects/${subject.id}`)} className="text-xs text-destructive">Unlink</button></div>
        <p className="mt-2 text-xs text-muted-foreground">Teachers</p>
        {subject.teachers.map((teacher) => <div key={teacher.userId} className="flex justify-between text-xs"><span>{personName(staff, teacher.userId)}</span><button onClick={() => update(`/api/sections/${section.id}/subjects/${subject.id}/teachers/${teacher.userId}`)} className="text-destructive">Remove</button></div>)}
        <MemberSelect label="Assign teacher…" options={staff.filter((m) => members.teachers.includes(m.userId))} onSelect={(userId) => update(`/api/sections/${section.id}/subjects/${subject.id}/teachers`, { userId })} />
      </div>)}
    </div>
    <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
      <MemberList label="Teachers" ids={members.teachers} people={staff} remove={(id) => update(`/api/sections/${section.id}/members/${id}`)} />
      <MemberList label="Students" ids={members.students} people={students} remove={(id) => update(`/api/sections/${section.id}/members/${id}`)} />
    </div>
  </section>;
}

function MemberList({ label, ids, people, remove }: { label: string; ids: string[]; people: Member[]; remove: (id: string) => void }) {
  return <div>
    <p className="text-muted-foreground">{label}</p>
    {ids.length ? ids.map((id) => <div key={id} className="mt-1 flex items-center justify-between"><span>{personName(people, id)}</span><button onClick={() => remove(id)} className="text-destructive">Remove</button></div>) : <p className="mt-1 text-muted-foreground">None assigned</p>}
  </div>;
}

function MemberSelect({ label, options, onSelect }: { label: string; options: Member[]; onSelect: (id: string) => void }) {
  return <select defaultValue="" onChange={(e) => { if (e.target.value) onSelect(e.target.value); e.target.value = ""; }} className="mt-2 w-full rounded-lg border border-border px-2 py-1.5 text-xs"><option value="">{label}</option>{options.map((m) => <option key={m.userId} value={m.userId}>{personName([m], m.userId)}</option>)}</select>;
}

function personName(people: Member[], id: string) {
  const person = people.find((m) => m.userId === id);
  return person?.displayName || [person?.firstName, person?.lastName].filter(Boolean).join(" ") || person?.email || id;
}
