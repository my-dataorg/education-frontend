"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUserName } from "@/components/user-identity";
import type { Member, Period, Section, Subject } from "@/lib/api";
import { classSectionLabel } from "@/lib/utils";

const BAND_LABEL: Record<string, string> = {
  primary: "Primary (1–5)",
  middle: "Middle (6–8)",
  high: "High (9–10)",
};

const DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

function sectionLabel(s: Section) {
  return classSectionLabel(s.className, s.name) || s.name;
}

function slotLabel(weekday: string, startTime: string) {
  const days =
    weekday === "everyday"
      ? "Everyday"
      : weekday
          .split(",")
          .map((value) => DAYS.find((d) => d.value === value.trim())?.label || value.trim())
          .join(", ");
  const [h, m] = startTime.split(":").map(Number);
  const endHour = ((h || 0) + 1) % 24;
  const end = `${String(endHour).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
  return `${days} ${startTime}–${end}`;
}

export function TimetableManager({
  instituteId,
  sections,
  staff,
  subjects,
  refreshKey = 0,
}: {
  instituteId: string;
  sections: Section[];
  staff: Member[];
  subjects: Subject[];
  refreshKey?: number;
}) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [assigned, setAssigned] = useState<{ userId: string; subjectId: string | null }[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [teacherUserId, setTeacherUserId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [semester, setSemester] = useState("");
  const [everyday, setEveryday] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/periods`, { credentials: "include" }).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setPeriods(Array.isArray(data) ? data : []);
      }
    });
  }, [instituteId, refreshKey, reload]);

  useEffect(() => {
    if (!sectionId) {
      setAssigned([]);
      return;
    }
    fetch(`/api/sections/${sectionId}`, { credentials: "include" }).then(async (res) => {
      if (!res.ok) {
        setAssigned([]);
        return;
      }
      const data = await res.json();
      const rows = Array.isArray(data.teachers) ? data.teachers : [];
      setAssigned(
        rows.map((t: { userId: string; subjectId?: string | null }) => ({
          userId: t.userId,
          subjectId: t.subjectId || null,
        }))
      );
    });
  }, [sectionId, refreshKey, reload]);

  const teachersForSection = useMemo(() => {
    const ids = new Set(assigned.map((a) => a.userId));
    return staff.filter((m) => ids.has(m.userId));
  }, [staff, assigned]);

  const teacherSubjects = useMemo(() => {
    const ids = new Set(
      assigned.filter((a) => a.userId === teacherUserId && a.subjectId).map((a) => a.subjectId as string)
    );
    return subjects.filter((s) => ids.has(s.id));
  }, [assigned, teacherUserId, subjects]);

  async function addPeriod(e: React.FormEvent) {
    e.preventDefault();
    const weekday = everyday
      ? "everyday"
      : DAYS.filter((d) => selectedDays.includes(d.value)).map((d) => d.value).join(",");
    if (!sectionId || !teacherUserId || !subjectId || !semester.trim() || !weekday || !startTime) {
      if (!everyday && selectedDays.length === 0) setMessage("Choose Everyday or at least one day.");
      return;
    }
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/institutes/${instituteId}/periods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sectionId,
        teacherUserId,
        subjectId,
        semester: semester.trim(),
        weekday,
        startTime,
      }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setReload((n) => n + 1);
    } else {
      setMessage(
        typeof data.detail === "string"
          ? data.detail
          : Array.isArray(data.detail)
            ? data.detail.map((item: { msg?: string } | string) =>
                typeof item === "string" ? item : item.msg || ""
              ).filter(Boolean).join(" ")
            : "Could not add period."
      );
    }
  }

  async function removePeriod(periodId: string) {
    const res = await fetch(`/api/institutes/${instituteId}/periods/${periodId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) setReload((n) => n + 1);
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">Timetable</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Same slot for the whole semester (for example Summer 2026). Choose Everyday, or pick the
        days this class meets. Each class is 1 hour.
      </p>
      <form onSubmit={addPeriod} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="text"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          required
          placeholder="Semester (e.g. Summer 2026)"
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <select
          value={sectionId}
          onChange={(e) => {
            setSectionId(e.target.value);
            setTeacherUserId("");
            setSubjectId("");
          }}
          required
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">Select section</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {sectionLabel(s)}
              {s.gradeBand ? ` (${BAND_LABEL[s.gradeBand] || s.gradeBand})` : ""}
            </option>
          ))}
        </select>
        <select
          value={teacherUserId}
          onChange={(e) => {
            setTeacherUserId(e.target.value);
            setSubjectId("");
          }}
          required
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">Select teacher</option>
          {teachersForSection.map((m) => (
            <option key={m.userId} value={m.userId}>
              {formatUserName(m)}
            </option>
          ))}
        </select>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          required
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">Select subject</option>
          {teacherSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="sm:col-span-2 rounded-lg border border-border px-3 py-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={everyday}
              onChange={(e) => {
                setEveryday(e.target.checked);
                if (e.target.checked) setSelectedDays([]);
              }}
            />
            Everyday
          </label>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {DAYS.map((d) => (
              <label key={d.value} className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={!everyday && selectedDays.includes(d.value)}
                  onChange={(e) => {
                    setEveryday(false);
                    setSelectedDays((current) =>
                      e.target.checked
                        ? [...current, d.value]
                        : current.filter((day) => day !== d.value)
                    );
                  }}
                />
                {d.label}
              </label>
            ))}
          </div>
        </div>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add 1-hour class"}
        </button>
      </form>
      {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
      {periods.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No periods yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {periods.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span>
                {p.semester} · {slotLabel(p.weekday, p.startTime)} ·{" "}
                {classSectionLabel(p.className, p.sectionName)} ·{" "}
                {p.subjectName}
              </span>
              <button
                type="button"
                onClick={() => removePeriod(p.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
