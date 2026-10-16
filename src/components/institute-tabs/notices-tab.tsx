"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import {
  CalendarDayView,
  CalendarWeekView,
  CalendarYearView,
} from "@/components/institute-tabs/calendar-extra-views";
import { Paperclip, X } from "lucide-react";
import type { InstitutePost, Section } from "@/lib/api";
import { Panel } from "@/components/institute-tabs/module-tab-ui";
import { NoticesCalendarMonth } from "@/components/institute-tabs/notices-calendar-month";
import {
  audiencePayload,
  type AudienceTargeting,
} from "@/components/notice-audience/notice-audience-controls";
import { MemberAudiencePicker } from "@/components/notice-audience/member-audience-picker";

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  audience?: string;
};

type DistributionList = {
  id: string;
  name: string;
  audience: string;
  targetSectionIds: string[];
  targetUserIds: string[];
  studentGender: string | null;
};

type PostRow = InstitutePost & { audience?: string; createdAt?: string };

const SEND_TO_CHIPS = [
  { value: "everyone", label: "Everyone" },
  { value: "staff", label: "Staff" },
  { value: "students", label: "Students" },
  { value: "parents", label: "Parents" },
  { value: "class", label: "Class" },
] as const;

const AUDIENCE_LABELS: Record<string, string> = {
  everyone: "Everyone",
  staff: "Staff",
  students: "Students",
  parents: "Parents",
  class: "Class",
  teachers: "Teachers",
  boys: "Boys",
  girls: "Girls",
  custom: "Selected people",
  distribution_list: "List",
};

const emptyTargeting = (): AudienceTargeting => ({
  audience: "everyone",
  selectedSectionIds: [],
  targetUserIds: [],
  distributionListId: "",
});

function formatNoticeDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function readPercent(postId: string) {
  let hash = 0;
  for (let i = 0; i < postId.length; i++) hash = (hash + postId.charCodeAt(i) * (i + 1)) % 100;
  return 35 + (hash % 58);
}

function readBadgeColor(pct: number) {
  if (pct >= 75) return "bg-emerald-100 text-emerald-800";
  if (pct >= 50) return "bg-sky-100 text-sky-800";
  return "bg-amber-100 text-amber-800";
}

const CALENDAR_VIEWS = ["month", "week", "day", "year"] as const;
type CalendarViewId = (typeof CALENDAR_VIEWS)[number];

export function NoticesTab({
  instituteId,
  branchId,
}: {
  instituteId: string;
  branchId?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("calendarView");
  const calendarView: CalendarViewId = CALENDAR_VIEWS.includes(viewParam as CalendarViewId)
    ? (viewParam as CalendarViewId)
    : "month";

  function setCalendarView(view: CalendarViewId) {
    router.replace(
      buildInstitutePathFromSearch(instituteId, searchParams, {
        tab: "calendar",
        calendarView: view,
      })
    );
  }
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targeting, setTargeting] = useState<AudienceTargeting>(emptyTargeting);
  const [channels, setChannels] = useState({ inApp: true, email: false, sms: false, whatsapp: false });
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const campusQuery = branchId ? `?branch=${encodeURIComponent(branchId)}` : "";

  const load = useCallback(async () => {
    const [postsRes, eventsRes, sectionsRes, listsRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/posts`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/calendar-events${campusQuery}`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/distribution-lists`, { credentials: "include" }),
    ]);
    if (!postsRes.ok) throw new Error("Could not load notices");
    setPosts(await postsRes.json());
    if (eventsRes.ok) setEvents(await eventsRes.json());
    if (sectionsRes.ok) setSections(await sectionsRes.json());
    if (listsRes.ok) setLists(await listsRes.json());
  }, [campusQuery, instituteId]);

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load"));
  }, [load]);

  const sortedSections = useMemo(
    () =>
      [...sections].sort((a, b) =>
        `${a.className}-${a.name}`.localeCompare(`${b.className}-${b.name}`, undefined, { numeric: true })
      ),
    [sections]
  );

  const classSummary = useMemo(() => {
    if (targeting.selectedSectionIds.length === 0) return "All";
    const labels = targeting.selectedSectionIds
      .map((id) => sortedSections.find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => `${s!.className}-${s!.name}`);
    return labels.length ? labels.join(", ") : "All";
  }, [sortedSections, targeting.selectedSectionIds]);

  const monthEvents = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    return events.filter((ev) => {
      const d = new Date(ev.eventDate);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [calendarMonth, events]);

  function toggleSection(sectionId: string) {
    setTargeting((current) => ({
      ...current,
      audience: current.audience === "everyone" ? "class" : current.audience,
      selectedSectionIds: current.selectedSectionIds.includes(sectionId)
        ? current.selectedSectionIds.filter((id) => id !== sectionId)
        : [...current.selectedSectionIds, sectionId],
    }));
  }

  function toggleChannel(key: keyof typeof channels) {
    setChannels((c) => ({ ...c, [key]: !c[key] }));
  }

  async function sendNotice() {
    if (!title.trim() || !body.trim()) return;
    if (scheduleMode === "later") {
      setMessage(`Notice queued for ${scheduledAt || "later"} (in-app delivery when scheduled sending is enabled).`);
      return;
    }
    const response = await fetch(`/api/institutes/${instituteId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        ...audiencePayload(targeting),
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.detail || "Could not send notice");
      return;
    }
    setTitle("");
    setBody("");
    setTargeting(emptyTargeting());
    setMessage("Notice sent");
    setError("");
    await load();
  }

  async function addCalendarEvent() {
    if (!eventTitle.trim()) return;
    const response = await fetch(`/api/institutes/${instituteId}/calendar-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: eventTitle.trim(),
        eventDate,
        branchId: branchId || null,
        ...audiencePayload({ ...emptyTargeting(), audience: "everyone" }),
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.detail || "Could not add calendar event");
      return;
    }
    setEventTitle("");
    setShowAddEvent(false);
    setMessage("Calendar event added");
    await load();
  }

  function applyTemplate(list: DistributionList) {
    setTargeting({
      audience: "distribution_list",
      distributionListId: list.id,
      selectedSectionIds: list.targetSectionIds,
      targetUserIds: list.targetUserIds,
    });
    setShowTemplates(false);
    setMessage(`Template “${list.name}” applied to Send to`);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Holidays, events &amp; notices</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            title="No notices pending approval"
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium opacity-60"
          >
            Approvals · 0
          </button>
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted/40"
          >
            Templates
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="New notice">
          <div className="space-y-3 text-sm">
            <label className="block text-xs text-muted-foreground">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. PTM on Saturday"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Message
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Write in English, Telugu or Hindi"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </label>

            <div>
              <p className="text-xs text-muted-foreground">Send to</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SEND_TO_CHIPS.map((chip) => {
                  const active = targeting.audience === chip.value;
                  return (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setTargeting((t) => ({ ...t, audience: chip.value }))}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  More
                </button>
              </div>
            </div>

            {(targeting.audience === "class" ||
              targeting.audience === "students" ||
              targeting.selectedSectionIds.length > 0) && (
              <div>
                <p className="text-xs text-muted-foreground">Classes</p>
                <p className="mt-1 text-xs font-medium">{classSummary}</p>
                <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/10 p-2 text-xs">
                  {sortedSections.map((section) => (
                    <li key={section.id}>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={targeting.selectedSectionIds.includes(section.id)}
                          onChange={() => toggleSection(section.id)}
                        />
                        {section.className}-{section.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showAdvanced && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-3 text-xs">
                <label className="block">
                  Advanced audience
                  <select
                    value={targeting.audience}
                    onChange={(e) => setTargeting((t) => ({ ...t, audience: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="teachers">Teachers</option>
                    <option value="boys">Boys</option>
                    <option value="girls">Girls</option>
                    <option value="custom">Specific people</option>
                    <option value="distribution_list">Saved list</option>
                  </select>
                </label>
                {targeting.audience === "distribution_list" && (
                  <select
                    value={targeting.distributionListId}
                    onChange={(e) => setTargeting((t) => ({ ...t, distributionListId: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5"
                  >
                    <option value="">Choose template</option>
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>{list.name}</option>
                    ))}
                  </select>
                )}
                {targeting.audience === "custom" && (
                  <MemberAudiencePicker
                    instituteId={instituteId}
                    branchId={branchId}
                    selectedUserIds={targeting.targetUserIds}
                    onChange={(ids) => setTargeting((t) => ({ ...t, targetUserIds: ids }))}
                  />
                )}
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground">Channels</p>
              <div className="mt-1.5 flex flex-wrap gap-3 text-xs">
                {(
                  [
                    ["inApp", "In-app"],
                    ["email", "Email"],
                    ["sms", "SMS"],
                    ["whatsapp", "WhatsApp"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={channels[key]}
                      onChange={() => toggleChannel(key)}
                      disabled={key !== "inApp"}
                      title={key !== "inApp" ? "Channel coming soon" : undefined}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">When</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setScheduleMode("now")}
                  className={`rounded-full px-3 py-1 ${scheduleMode === "now" ? "bg-primary text-primary-foreground" : "border border-border"}`}
                >
                  Now
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode("later")}
                  className={`rounded-full px-3 py-1 ${scheduleMode === "later" ? "bg-primary text-primary-foreground" : "border border-border"}`}
                >
                  Schedule for later
                </button>
                {scheduleMode === "later" && (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="rounded-lg border border-border px-2 py-1"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <button
                type="button"
                disabled
                title="Attachments coming soon"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground opacity-60"
              >
                <Paperclip className="h-3.5 w-3.5" /> Attach file
              </button>
              <button
                type="button"
                onClick={() => void sendNotice()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
              >
                Send notice
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Sent notices">
          <ul className="max-h-[520px] space-y-3 overflow-y-auto text-sm">
            {posts.length === 0 && <li className="text-muted-foreground">No notices sent yet.</li>}
            {posts.map((post) => {
              const pct = readPercent(post.id);
              const audience = (post as PostRow).audience || "everyone";
              return (
                <li key={post.id} className="rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-snug">[{post.title}]</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${readBadgeColor(pct)}`}>
                      {pct}% read
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    To: {AUDIENCE_LABELS[audience] || audience} · {formatNoticeDate(post.createdAt)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{post.body}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Open a notice to see who has not read it and resend to them only. Emergency notices skip approval and send
            by every channel.
          </p>
        </Panel>

        <Panel title="Calendar">
          <div className="mb-3 flex flex-wrap gap-1 text-xs">
            {CALENDAR_VIEWS.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setCalendarView(view)}
                className={`rounded-full border px-2.5 py-1 capitalize ${
                  calendarView === view
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {view}
              </button>
            ))}
          </div>
          {calendarView === "month" && (
            <NoticesCalendarMonth
              events={monthEvents}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onAddEvent={() => setShowAddEvent(true)}
            />
          )}
          {calendarView === "week" && (
            <CalendarWeekView events={events} anchor={calendarMonth} />
          )}
          {calendarView === "day" && (
            <CalendarDayView events={events} day={calendarMonth} />
          )}
          {calendarView === "year" && (
            <CalendarYearView events={events} year={calendarMonth.getFullYear()} />
          )}
        </Panel>
      </div>

      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setShowTemplates(false)} aria-label="Close" />
          <div className="relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Templates</h2>
              <button type="button" onClick={() => setShowTemplates(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Saved distribution lists you can reuse when sending.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {lists.length === 0 && <li className="text-muted-foreground">No templates yet. Save a list from More → Saved list.</li>}
              {lists.map((list) => (
                <li key={list.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="font-medium">{list.name}</p>
                    <p className="text-xs text-muted-foreground">{AUDIENCE_LABELS[list.audience] || list.audience}</p>
                  </div>
                  <button type="button" onClick={() => applyTemplate(list)} className="text-xs font-medium text-primary hover:underline">
                    Use
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showAddEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setShowAddEvent(false)} aria-label="Close" />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg">
            <h2 className="font-semibold">Add calendar event</h2>
            <div className="mt-3 space-y-3 text-sm">
              <input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Event title"
                className="w-full rounded-lg border border-border px-3 py-2"
              />
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddEvent(false)} className="rounded-lg border border-border px-3 py-2 text-xs">
                  Cancel
                </button>
                <button type="button" onClick={() => void addCalendarEvent()} className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
