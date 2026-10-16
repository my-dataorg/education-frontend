"use client";

import { useCallback, useEffect, useState } from "react";
import type { InstitutePost, Section } from "@/lib/api";
import { ModuleHeader, Panel } from "@/components/institute-tabs/module-tab-ui";

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  eventDate: string;
};

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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("everyone");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const campusQuery = branchId ? `?branch=${encodeURIComponent(branchId)}` : "";

  const load = useCallback(async () => {
    const [postsRes, eventsRes, sectionsRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/posts`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/calendar-events${campusQuery}`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" }),
    ]);
    if (!postsRes.ok) throw new Error("Could not load notices");
    setPosts(await postsRes.json());
    if (eventsRes.ok) setEvents(await eventsRes.json());
    if (sectionsRes.ok) setSections(await sectionsRes.json());
  }, [campusQuery, instituteId]);

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load"));
  }, [load]);

  async function sendNotice() {
    if (!title.trim() || !body.trim()) return;
    const response = await fetch(`/api/institutes/${instituteId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: title.trim(), body: body.trim(), audience }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.detail || "Could not send notice");
      return;
    }
    setTitle("");
    setBody("");
    setMessage("Notice sent");
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
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.detail || "Could not add calendar event");
      return;
    }
    setEventTitle("");
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
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="everyone">Everyone</option>
              <option value="staff">Staff</option>
              <option value="students">Students</option>
              <option value="parents">Parents</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {sections.length} sections on this campus can be targeted in a future class notice flow.
            </p>
          </div>
        </Panel>
        <Panel title={monthLabel}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Event title"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
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
                  <p className="text-xs text-muted-foreground">{event.eventDate}</p>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
      <Panel title="Recent notices">
        <ul className="space-y-3">
          {posts.length === 0 && <li className="text-sm text-muted-foreground">No notices yet.</li>}
          {posts.map((post) => (
            <li key={post.id} className="rounded-lg border border-border px-3 py-2">
              <p className="font-medium">{post.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{post.body}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </section>
  );
}
