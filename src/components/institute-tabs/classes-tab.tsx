"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { InstituteSummary, Section, SectionSubject, Subject } from "@/lib/api";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";

const CLASSES_TABS = ["sections", "subjects", "activities", "rooms", "section-subjects"] as const;
type ClassesTabId = (typeof CLASSES_TABS)[number];

type Props = {
  instituteId: string;
  branches: InstituteSummary["branches"];
  configureTab?: ClassesTabId;
};

type Activity = { id: string; name: string };
type Room = { id: string; name: string };

export function ClassesTab({ instituteId, branches, configureTab }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = configureTab ?? searchParams.get("configureTab") ?? searchParams.get("classesTab");
  const activeTab: ClassesTabId = CLASSES_TABS.includes(tabParam as ClassesTabId)
    ? (tabParam as ClassesTabId)
    : "sections";

  function selectTab(tab: ClassesTabId) {
    router.replace(
      buildInstitutePathFromSearch(instituteId, searchParams, {
        tab: "configure",
        configureTab: tab,
      })
    );
  }
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [activityName, setActivityName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [className, setClassName] = useState("");
  const [linkSectionId, setLinkSectionId] = useState("");
  const [linkSubjectId, setLinkSubjectId] = useState("");
  const [linkWeeklyPeriods, setLinkWeeklyPeriods] = useState("5");
  const [sectionSubjects, setSectionSubjects] = useState<SectionSubject[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [sectionRes, subjectRes, activityRes, roomRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/sections`),
      fetch(`/api/institutes/${instituteId}/subjects`),
      fetch(`/api/institutes/${instituteId}/activities`),
      fetch(`/api/institutes/${instituteId}/rooms`),
    ]);
    const [nextSections, nextSubjects, nextActivities, nextRooms] = await Promise.all([
      sectionRes.json(),
      subjectRes.json(),
      activityRes.json(),
      roomRes.ok ? roomRes.json() : [],
    ]);
    setSections(nextSections);
    setSubjects(nextSubjects);
    setActivities(nextActivities);
    setRooms(nextRooms);
    setLinkSectionId((current) => current || nextSections[0]?.id || "");
  }, [instituteId]);

  const loadSectionSubjects = useCallback(async (sectionId: string) => {
    if (!sectionId) {
      setSectionSubjects([]);
      return;
    }
    const res = await fetch(`/api/sections/${sectionId}/subjects`, { credentials: "include" });
    setSectionSubjects(res.ok ? await res.json() : []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load classes"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    loadSectionSubjects(linkSectionId).catch((e) =>
      setError(e instanceof Error ? e.message : "Could not load section subjects")
    );
  }, [linkSectionId, loadSectionSubjects]);

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

  async function createRoom() {
    if (!roomName.trim()) return;
    try {
      await change(`/api/institutes/${instituteId}/rooms`, {
        method: "POST",
        body: JSON.stringify({ name: roomName.trim() }),
      });
      setRoomName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create room");
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

  async function linkSubjectToSection() {
    if (!linkSectionId || !linkSubjectId) return;
    const periods = Number(linkWeeklyPeriods);
    if (!Number.isFinite(periods) || periods < 1 || periods > 40) {
      setError("Weekly periods must be between 1 and 40");
      return;
    }
    try {
      await change(`/api/sections/${linkSectionId}/subjects`, {
        method: "POST",
        body: JSON.stringify({ subjectId: linkSubjectId }),
      });
      await change(`/api/sections/${linkSectionId}/subjects/${linkSubjectId}`, {
        method: "PATCH",
        body: JSON.stringify({ weeklyPeriods: periods }),
      });
      setLinkSubjectId("");
      await loadSectionSubjects(linkSectionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not link subject");
    }
  }

  async function saveWeeklyPeriods(sectionId: string, subjectId: string, raw: string) {
    const periods = raw.trim() === "" ? null : Number(raw);
    if (periods !== null && (!Number.isFinite(periods) || periods < 1 || periods > 40)) {
      setError("Weekly periods must be between 1 and 40");
      return;
    }
    try {
      await change(`/api/sections/${sectionId}/subjects/${subjectId}`, {
        method: "PATCH",
        body: JSON.stringify({ weeklyPeriods: periods }),
      });
      await loadSectionSubjects(sectionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update weekly periods");
    }
  }

  async function unlinkSectionSubject(sectionId: string, subjectId: string) {
    try {
      await change(`/api/sections/${sectionId}/subjects/${subjectId}`, { method: "DELETE" });
      await loadSectionSubjects(sectionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unlink subject");
    }
  }

  const availableLinkSubjects = subjects.filter(
    (subject) => !sectionSubjects.some((linked) => linked.id === subject.id)
  );

  return (
    <div className="space-y-5">
      {!configureTab && (
        <>
          <div>
            <h1 className="text-2xl font-semibold">Classes & subjects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up classes, institute subjects, activities, and weekly period links for the timetable.
            </p>
          </div>

          <div className="flex flex-wrap gap-5 border-b border-border px-1 text-xs">
            <ClassesSubTab label="Classes" active={activeTab === "sections"} onClick={() => selectTab("sections")} />
            <ClassesSubTab label="Subjects" active={activeTab === "subjects"} onClick={() => selectTab("subjects")} />
            <ClassesSubTab label="Activities" active={activeTab === "activities"} onClick={() => selectTab("activities")} />
            <ClassesSubTab
              label="Subjects per class"
              active={activeTab === "section-subjects"}
              onClick={() => selectTab("section-subjects")}
            />
          </div>
        </>
      )}

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {activeTab === "subjects" && (
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
      )}

      {activeTab === "sections" && (
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
      )}

      {activeTab === "rooms" && (
        <FormCard title="Rooms">
          <p className="text-xs text-muted-foreground">
            Room names used when building the class timetable (e.g. 101, Lab-A, Hall).
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Room name or number"
              maxLength={30}
              className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void createRoom()}
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              Add
            </button>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {rooms.map((room) => (
              <li key={room.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                {room.name}
                <button
                  type="button"
                  onClick={() => void deleteSubject(`/api/institutes/${instituteId}/rooms/${room.id}`)}
                  className="text-xs text-destructive"
                >
                  Delete
                </button>
              </li>
            ))}
            {!rooms.length && (
              <p className="text-xs text-muted-foreground">No rooms yet. Add rooms to use them in the timetable.</p>
            )}
          </ul>
        </FormCard>
      )}

      {activeTab === "activities" && (
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
      )}

      {activeTab === "section-subjects" && (
        <FormCard title="Subjects per class">
          <p className="text-xs text-muted-foreground">
            Link institute subjects to a section and set how many periods per week each needs for the timetable.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={linkSectionId}
              onChange={(e) => setLinkSectionId(e.target.value)}
              className="min-w-40 flex-1 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="">Select section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.className ? `${section.className}-${section.name}` : section.name}
                </option>
              ))}
            </select>
          </div>
          {linkSectionId && (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  value={linkSubjectId}
                  onChange={(e) => setLinkSubjectId(e.target.value)}
                  className="min-w-40 flex-1 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <option value="">Add subject…</option>
                  {availableLinkSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={linkWeeklyPeriods}
                  onChange={(e) => setLinkWeeklyPeriods(e.target.value)}
                  placeholder="Periods / week"
                  className="w-28 rounded-lg border border-border px-3 py-2 text-sm"
                  aria-label="Weekly periods"
                />
                <button
                  type="button"
                  onClick={linkSubjectToSection}
                  disabled={!linkSubjectId}
                  className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                >
                  Link
                </button>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {sectionSubjects.map((subject) => (
                  <li key={subject.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="font-medium">{subject.name}</span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        Periods / week
                        <input
                          type="number"
                          min={1}
                          max={40}
                          defaultValue={subject.weeklyPeriods ?? ""}
                          key={`${subject.id}-${subject.weeklyPeriods ?? "empty"}`}
                          onBlur={(e) => saveWeeklyPeriods(linkSectionId, subject.id, e.target.value)}
                          className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => unlinkSectionSubject(linkSectionId, subject.id)}
                        className="text-xs text-destructive"
                      >
                        Unlink
                      </button>
                    </div>
                  </li>
                ))}
                {!sectionSubjects.length && (
                  <p className="text-xs text-muted-foreground">No subjects linked to this section yet.</p>
                )}
              </ul>
            </>
          )}
        </FormCard>
      )}
    </div>
  );
}

function ClassesSubTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 pb-2.5 ${active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {label}
    </button>
  );
}

function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-4 shadow-sm"><h3 className="mb-3 font-semibold">{title}</h3>{children}</section>;
}
