"use client";

import { useCallback, useEffect, useState } from "react";
import type { InstitutePost, Section } from "@/lib/api";
import { ModuleHeader, Panel } from "@/components/institute-tabs/module-tab-ui";
import {
  audiencePayload,
  NoticeAudienceControls,
  type AudienceTargeting,
} from "@/components/notice-audience/notice-audience-controls";

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

const emptyTargeting = (): AudienceTargeting => ({
  audience: "everyone",
  selectedSectionIds: [],
  targetUserIds: [],
  distributionListId: "",
});

export function NoticesTab({
  instituteId,
  branchId,
}: {
  instituteId: string;
  branchId?: string | null;
}) {
  const [posts, setPosts] = useState<InstitutePost[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [noticeTargeting, setNoticeTargeting] = useState<AudienceTargeting>(emptyTargeting);
  const [eventTargeting, setEventTargeting] = useState<AudienceTargeting>(emptyTargeting);
  const [dlName, setDlName] = useState("");
  const [dlSource, setDlSource] = useState<AudienceTargeting>(emptyTargeting);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
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

  function patchNotice(patch: Partial<AudienceTargeting>) {
    setNoticeTargeting((current) => ({ ...current, ...patch }));
    setDlSource((current) => ({ ...current, ...patch }));
  }

  function patchEvent(patch: Partial<AudienceTargeting>) {
    setEventTargeting((current) => ({ ...current, ...patch }));
  }

  async function sendNotice() {
    if (!title.trim() || !body.trim()) return;
    const response = await fetch(`/api/institutes/${instituteId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        ...audiencePayload(noticeTargeting),
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.detail || "Could not send notice");
      return;
    }
    setTitle("");
    setBody("");
    setNoticeTargeting(emptyTargeting());
    setMessage("Notice sent");
    setError("");
    await load();
  }

  async function saveDistributionList() {
    if (!dlName.trim()) return;
    const payload = audiencePayload(dlSource);
    const response = await fetch(`/api/institutes/${instituteId}/distribution-lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: dlName.trim(),
        audience: payload.audience === "distribution_list" ? "students" : payload.audience,
        targetSectionIds: dlSource.selectedSectionIds,
        targetUserIds: dlSource.targetUserIds,
        studentGender: payload.studentGender,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.detail || "Could not save distribution list");
      return;
    }
    setDlName("");
    setMessage("Distribution list saved");
    setError("");
    await load();
  }

  async function deleteDistributionList(listId: string) {
    const response = await fetch(`/api/institutes/${instituteId}/distribution-lists/${listId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok && response.status !== 204) {
      setError("Could not delete distribution list");
      return;
    }
    setMessage("Distribution list removed");
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
        ...audiencePayload(eventTargeting),
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.detail || "Could not add calendar event");
      return;
    }
    setEventTitle("");
    setEventTargeting(emptyTargeting());
    setMessage("Calendar event added");
    await load();
  }

  const monthLabel = new Date().toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <section className="space-y-5">
      <ModuleHeader
        title="Notices & calendar"
        description="Publish updates and maintain the school calendar"
        action={
          <button
            type="button"
            onClick={() => void sendNotice()}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          >
            Send notice
          </button>
        }
      />
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
      )}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="New notice">
          <div className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Message"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
            <NoticeAudienceControls
              idPrefix="notice"
              instituteId={instituteId}
              branchId={branchId}
              sections={sections}
              lists={lists}
              value={noticeTargeting}
              onChange={patchNotice}
            />
          </div>
        </Panel>
        <Panel title={monthLabel}>
          <div className="space-y-3">
            <input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Event title"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <NoticeAudienceControls
              idPrefix="event"
              instituteId={instituteId}
              branchId={branchId}
              sections={sections}
              lists={lists}
              value={eventTargeting}
              onChange={patchEvent}
            />
            <button
              type="button"
              onClick={() => void addCalendarEvent()}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium"
            >
              Add to calendar
            </button>
            <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
              {events.length === 0 && <li className="text-muted-foreground">No events this month.</li>}
              {events.map((event) => (
                <li key={event.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.eventDate}
                    {event.audience && event.audience !== "everyone" ? ` · ${event.audience}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <Panel title="Distribution lists">
        <p className="mb-3 text-sm text-muted-foreground">
          Save a reusable audience and pick it when sending notices or calendar events.
        </p>
        <div className="mb-4 rounded-lg border border-border bg-muted/10 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Targeting to save</p>
          <NoticeAudienceControls
            idPrefix="dl"
            instituteId={instituteId}
            branchId={branchId}
            sections={sections}
            lists={lists}
            value={dlSource}
            onChange={(patch) => setDlSource((current) => ({ ...current, ...patch }))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={dlName}
            onChange={(e) => setDlName(e.target.value)}
            placeholder="List name (e.g. Grade 9 parents)"
            className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void saveDistributionList()}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium"
          >
            Save list
          </button>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {lists.length === 0 && <li className="text-muted-foreground">No lists yet.</li>}
          {lists.map((list) => (
            <li key={list.id} className="flex items-start justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <div>
                <p className="font-medium">{list.name}</p>
                <p className="text-xs text-muted-foreground">
                  {list.audience}
                  {list.targetSectionIds.length > 0 && ` · ${list.targetSectionIds.length} section(s)`}
                  {list.targetUserIds.length > 0 && ` · ${list.targetUserIds.length} person(s)`}
                  {list.studentGender && ` · ${list.studentGender}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void deleteDistributionList(list.id)}
                className="shrink-0 text-xs text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Recent notices">
        <ul className="space-y-3">
          {posts.length === 0 && <li className="text-sm text-muted-foreground">No notices yet.</li>}
          {posts.map((post) => (
            <li key={post.id} className="rounded-lg border border-border px-3 py-2">
              <p className="font-medium">{post.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Audience: {(post as { audience?: string }).audience || "everyone"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{post.body}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </section>
  );
}
