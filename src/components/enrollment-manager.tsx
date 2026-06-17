"use client";

import { useEffect, useState } from "react";
import { ROLE_LABELS } from "@/lib/roles";
import { formatUserName } from "@/components/user-identity";
import type { Member } from "@/lib/api";

type Section = { id: string; name: string; className?: string };

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
  const [sectionId, setSectionId] = useState("");
  const [userId, setUserId] = useState("");
  const [memberType, setMemberType] = useState<"teacher" | "student">("student");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/members?group=staff`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/members?group=students`, { credentials: "include" }),
    ]).then(async ([sRes, stRes, sdRes]) => {
      if (sRes.ok) setSections(await sRes.json());
      if (stRes.ok) setStaff(await stRes.json());
      if (sdRes.ok) setStudents(await sdRes.json());
    });
  }, [instituteId, refreshKey]);

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
      onChanged?.();
    } else {
      const data = await res.json();
      setMessage(data.detail || "Could not assign.");
    }
  }

  const roster =
    memberType === "teacher"
      ? staff.filter((m) => ["teacher", "lecturer", "professor", "principal", "admin"].includes(m.role))
      : students;

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">Enrollment manager</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Assign teachers and students to sections
      </p>
      <form onSubmit={assign} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          required
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">Select section</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={memberType}
          onChange={(e) => {
            setMemberType(e.target.value as "teacher" | "student");
            setUserId("");
          }}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
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
  );
}
