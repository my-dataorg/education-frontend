"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import type { InstituteSummary, Section, Subject } from "@/lib/api";

type Props = { instituteId: string; branches: InstituteSummary["branches"] };
type Activity = { id: string; name: string };

export function ClassesTab({ instituteId, branches }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [activityName, setActivityName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [className, setClassName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [sectionRes, subjectRes, activityRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/sections`),
      fetch(`/api/institutes/${instituteId}/subjects`),
      fetch(`/api/institutes/${instituteId}/activities`),
    ]);
    const [nextSections, nextSubjects, nextActivities] = await Promise.all([
      sectionRes.json(),
      subjectRes.json(),
      activityRes.json(),
    ]);
    setSections(nextSections);
    setSubjects(nextSubjects);
    setActivities(nextActivities);
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

  async function createActivity() {
    if (!activityName.trim()) return;
    try {
      await change(`/api/institutes/${instituteId}/activities`, {
        method: "POST",
        body: JSON.stringify({ name: activityName }),
      });
      setActivityName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create activity");
    }
  }

  async function deleteSubject(path: string) {
    try {
      await change(path, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete subject");
    }
  }

  async function deleteSection(sectionId: string) {
    if (!window.confirm("Delete this class and section?")) return;

    try {
      await change(`/api/institutes/${instituteId}/sections/${sectionId}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete class");
    }
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
            {subjects.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                {s.name}
                <button
                  onClick={() => deleteSubject(`/api/institutes/${instituteId}/subjects/${s.id}`)}
                  className="text-xs text-destructive"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </FormCard>
        <FormCard title="Classes and sections">
          <div className="flex gap-2">
            <input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="Section name" className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm" />
            <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Class / grade" className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <button onClick={createSection} className="mt-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Add</button>
          <ul className="mt-3 space-y-1 text-sm">
            {sections.map((section) => (
              <li key={section.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span>{section.className ? `${section.className}-${section.name}` : section.name}</span>
                <button
                  onClick={() => deleteSection(section.id)}
                  className="text-xs text-destructive"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          {!sections.length && <p className="mt-3 text-xs text-muted-foreground">No classes yet.</p>}
        </FormCard>
        <FormCard title="Extra activities">
          <p className="text-xs text-muted-foreground">
            Use these for breaks, play time, lunch, and other non-subject periods.
          </p>
          <div className="mt-3 flex gap-2">
            <input value={activityName} onChange={(e) => setActivityName(e.target.value)} placeholder="Activity name" className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm" />
            <button onClick={createActivity} className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Add</button>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {activities.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                {activity.name}
                <button
                  onClick={() => deleteSubject(`/api/institutes/${instituteId}/activities/${activity.id}`)}
                  className="text-xs text-destructive"
                  disabled={["Break", "Play time", "Lunch time"].includes(activity.name)}
                >
                  {["Break", "Play time", "Lunch time"].includes(activity.name) ? "Default" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        </FormCard>
      </div>
    </div>
  );
}

function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-4 shadow-sm"><h3 className="mb-3 font-semibold">{title}</h3>{children}</section>;
}
