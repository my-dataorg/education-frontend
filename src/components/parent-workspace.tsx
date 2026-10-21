"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EducationNavSidebar } from "@/components/education-nav-sidebar";
import { EducationContextReporter } from "@/components/education-context-reporter";
import type { Assignment, Attendance, InstitutePost } from "@/lib/api";
import {
  getEducationNavItems,
  resolveEducationNavTab,
  type EducationNavId,
} from "@/lib/education-nav";
import { cn } from "@/lib/utils";

type GuardianChild = { studentId: string; instituteIds: string[] };
type ChildProfile = {
  sections: { sectionId: string; className?: string; sectionName?: string; name?: string }[];
};
type FeeDue = { balancePaise: number };
type Thread = { id: string; subject: string; status: string };
type Schedule = {
  publishedAt?: string | null;
  settings: { weekdays: number[] };
  slots: { id: string; label: string; start: string; end: string }[];
  entries: { dayOfWeek: number; sectionId: string; subjectId: string; slotId: string }[];
};

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function ParentWorkspace({
  instituteId,
  instituteName,
}: {
  instituteId: string;
  instituteName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const navItems = getEducationNavItems("parent");
  const [tab, setTab] = useState<EducationNavId>(() =>
    resolveEducationNavTab("parent", searchParams.get("tab"))
  );
  const [children, setChildren] = useState<GuardianChild[]>([]);
  const [childId, setChildId] = useState("");
  const [profiles, setProfiles] = useState<Record<string, ChildProfile>>({});
  const [posts, setPosts] = useState<InstitutePost[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [fees, setFees] = useState<FeeDue[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageStatus, setMessageStatus] = useState("");

  const label = navItems.find((item) => item.id === tab)?.label || "Home";

  function changeTab(next: EducationNavId) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/institutes/${instituteId}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    setTab(resolveEducationNavTab("parent", searchParams.get("tab")));
  }, [searchParams]);
  const activeChild = children.find((c) => c.studentId === childId);
  const profile = childId ? profiles[childId] : undefined;
  const sectionId = profile?.sections[0]?.sectionId;
  const classLabel = useMemo(() => classLabelForChild(profile), [profile]);

  const selectChild = useCallback(
    (nextId: string) => {
      setChildId(nextId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("child", nextId);
      router.replace(`/institutes/${instituteId}?${params.toString()}`, { scroll: false });
    },
    [instituteId, router, searchParams]
  );

  useEffect(() => {
    setLoading(true);
    fetch(`/api/parent/children?instituteId=${instituteId}`, { credentials: "include", cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load linked children");
        return response.json();
      })
      .then((data: { children?: GuardianChild[] }) => {
        const rows = (data.children || []).filter((c) => c.instituteIds.includes(instituteId));
        setChildren(rows);
        const fromUrl = searchParams.get("child");
        const initial = fromUrl && rows.some((c) => c.studentId === fromUrl) ? fromUrl : rows[0]?.studentId || "";
        if (initial) setChildId(initial);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load children"))
      .finally(() => setLoading(false));
  }, [instituteId, searchParams]);

  useEffect(() => {
    if (!childId) return;
    fetch(`/api/institutes/${instituteId}/members/${childId}/profile`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((row: ChildProfile | null) => {
        if (row) setProfiles((prev) => ({ ...prev, [childId]: row }));
      })
      .catch(() => undefined);
  }, [childId, instituteId]);

  useEffect(() => {
    if (!childId) return;
    Promise.all([
      fetch(`/api/institutes/${instituteId}/posts`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/schedule`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/subjects`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/fees/dues?studentId=${childId}`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/parent/children/${childId}/threads`, { credentials: "include" }),
    ])
      .then(async ([postsRes, scheduleRes, subjectsRes, feesRes, threadsRes]) => {
        if (postsRes.ok) setPosts(await postsRes.json());
        if (scheduleRes.ok) setSchedule(await scheduleRes.json());
        if (subjectsRes.ok) {
          const rows = (await subjectsRes.json()) as Array<{ id: string; name: string }>;
          setSubjects(Object.fromEntries(rows.map((s) => [s.id, s.name])));
        }
        if (feesRes.ok) setFees(await feesRes.json());
        else setFees([]);
        if (threadsRes.ok) setThreads(await threadsRes.json());
        else setThreads([]);
      })
      .catch(() => undefined);
  }, [childId, instituteId]);

  useEffect(() => {
    if (!sectionId || !childId) return;
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/sections/${sectionId}/students/${childId}/attendance?attendanceDate=${today}`, {
      credentials: "include",
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: Attendance[]) => setAttendance(rows[0] || null))
      .catch(() => setAttendance(null));

    fetch(`/api/sections/${sectionId}`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((overview: { assignments?: Assignment[] }) => {
        setAssignments(overview?.assignments || []);
      })
      .catch(() => setAssignments([]));
  }, [sectionId, childId]);

  const todayPeriods = useMemo(() => {
    if (!schedule || !sectionId) return [];
    const day = new Date().getDay() || 7;
    return schedule.entries
      .filter((e) => e.dayOfWeek === day && e.sectionId === sectionId)
      .map((e) => ({ ...e, slot: schedule.slots.find((s) => s.id === e.slotId) }))
      .filter((e) => e.slot);
  }, [schedule, sectionId]);

  const feeBalance = fees.reduce((sum, row) => sum + (row.balancePaise || 0), 0);

  async function sendMessage() {
    if (!childId || !messageSubject.trim()) return;
    setMessageStatus("");
    const response = await fetch(`/api/institutes/${instituteId}/parent/children/${childId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ subject: messageSubject, initialMessage: messageBody || undefined }),
    });
    if (!response.ok) {
      setMessageStatus("Could not send message. The school may have messaging turned off.");
      return;
    }
    setMessageSubject("");
    setMessageBody("");
    setMessageStatus("Message sent.");
    const list = await fetch(`/api/institutes/${instituteId}/parent/children/${childId}/threads`, {
      credentials: "include",
    });
    if (list.ok) setThreads(await list.json());
  }

  return (
    <>
      <EducationContextReporter instituteName={instituteName} role="parent" />
      <EducationNavSidebar items={navItems} activeTab={tab} onTabChange={changeTab}>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Parent / guardian</p>
          <h1 className="mt-1 text-2xl font-semibold">{label}</h1>

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          {loading ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
          ) : !children.length ? (
            <div className="mt-5 rounded-xl border border-dashed border-border bg-card p-6">
              <p className="font-medium">Link a child to get started</p>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                Once your institute links a child to your account, you will see timetable, attendance, academics, fees,
                notices, and messages here.
              </p>
            </div>
          ) : (
            <>
              {children.length > 1 ? (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground">Switch child</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {children.map((child) => (
                      <button
                        key={child.studentId}
                        type="button"
                        onClick={() => selectChild(child.studentId)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-sm",
                          childId === child.studentId
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {classLabelForChild(profiles[child.studentId]) || child.studentId.slice(0, 8)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{classLabel}</p>
              )}

              {tab === "overview" && activeChild && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Attendance today" value={attendance ? attendance.status : "Not marked"} />
                  <StatCard label="Fees due" value={feeBalance ? formatInr(feeBalance) : "—"} />
                  <StatCard label="Unread notices" value={String(posts.length)} />
                  <StatCard label="Homework due" value={String(assignments.length)} />
                </div>
              )}

              {tab === "overview" && (
                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  <Panel title="Today’s timetable">
                    {!schedule?.publishedAt && (
                      <p className="mb-2 text-sm text-muted-foreground">The timetable has not been published yet.</p>
                    )}
                    {todayPeriods.length ? (
                      <ul className="space-y-2 text-sm">
                        {todayPeriods.map((row, index) => (
                          <li key={index} className="rounded-lg bg-muted/40 px-3 py-2">
                            {row.slot?.start}–{row.slot?.end} · {subjects[row.subjectId] || row.slot?.label}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No periods today.</p>
                    )}
                  </Panel>
                  <Panel title="Latest notices">
                    {posts.slice(0, 3).map((post) => (
                      <article key={post.id} className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <p className="font-medium">{post.title}</p>
                        <p className="text-muted-foreground">{post.body}</p>
                      </article>
                    ))}
                    {!posts.length && <p className="text-sm text-muted-foreground">No notices yet.</p>}
                  </Panel>
                </div>
              )}

              {tab === "exams" && <Panel title="Assignments"><AssignmentList items={assignments} /></Panel>}

              {tab === "attendance" && (
                <Panel title="Attendance">
                  <p className="text-sm">
                    {attendance ? `Marked ${attendance.status} today.` : "No attendance marked for today yet."}
                  </p>
                </Panel>
              )}

              {tab === "fees" && (
                <Panel title="Fees & receipts">
                  {!fees.length ? (
                    <p className="text-sm text-muted-foreground">No fee records available for this child.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {fees.map((row, index) => (
                        <li key={index} className="flex justify-between rounded-lg bg-muted/40 px-3 py-2">
                          <span>Balance</span>
                          <span>{formatInr(row.balancePaise)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              )}

              {tab === "calendar" && (
                <Panel title="Notices">
                  {posts.map((post) => (
                    <article key={post.id} className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                      <p className="font-medium">{post.title}</p>
                      <p className="text-muted-foreground">{post.body}</p>
                    </article>
                  ))}
                  {!posts.length && <p className="text-sm text-muted-foreground">No notices yet.</p>}
                </Panel>
              )}

              {tab === "messages" && (
                <div className="mt-6 space-y-5">
                  <Panel title="Threads">
                    {threads.map((thread) => (
                      <div key={thread.id} className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <p className="font-medium">{thread.subject}</p>
                        <p className="text-xs text-muted-foreground">{thread.status}</p>
                      </div>
                    ))}
                    {!threads.length && <p className="text-sm text-muted-foreground">No messages yet.</p>}
                  </Panel>
                  <Panel title="New message to school">
                    <input
                      value={messageSubject}
                      onChange={(e) => setMessageSubject(e.target.value)}
                      placeholder="Subject"
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                    <textarea
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      placeholder="Message"
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={!messageSubject.trim()}
                      className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                    >
                      Send
                    </button>
                    {messageStatus && <p className="mt-2 text-xs text-muted-foreground">{messageStatus}</p>}
                  </Panel>
                </div>
              )}

              {tab === "profile" && (
                <Panel title="Linked children">
                  <ul className="space-y-2 text-sm">
                    {children.map((child) => (
                      <li key={child.studentId} className="rounded-lg bg-muted/40 px-3 py-2">
                        <span className="font-medium">{child.studentId}</span>
                        <span className="ml-2 text-muted-foreground">{classLabelForChild(profiles[child.studentId])}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </>
          )}
      </EducationNavSidebar>
    </>
  );
}

function classLabelForChild(profile?: ChildProfile) {
  if (!profile?.sections?.length) return "—";
  const s = profile.sections[0];
  if (s.className && s.sectionName) return `${s.className}-${s.sectionName}`;
  return s.name || "—";
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AssignmentList({ items }: { items: Assignment[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No assignments yet.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex justify-between rounded-lg bg-muted/40 px-3 py-2">
          <span>{item.title}</span>
          <span className="text-muted-foreground">{item.dueDate || "—"}</span>
        </li>
      ))}
    </ul>
  );
}
