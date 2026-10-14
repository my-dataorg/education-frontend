"use client";

import { useState } from "react";
import { Bell, CalendarDays, CircleDollarSign, FileText, Home, MessageSquare, UserRound } from "lucide-react";
import { EducationContextReporter } from "@/components/education-context-reporter";
import { cn } from "@/lib/utils";

const ITEMS = [
  ["home", "Home", Home],
  ["academics", "Academics", FileText],
  ["attendance", "Attendance & leave", CalendarDays],
  ["fees", "Fees & receipts", CircleDollarSign],
  ["notices", "Notices & PTM", Bell],
  ["messages", "Messages", MessageSquare],
  ["profile", "Profile & children", UserRound],
] as const;

export function ParentWorkspace({ instituteName }: { instituteName: string }) {
  const [tab, setTab] = useState<(typeof ITEMS)[number][0]>("home");
  const label = ITEMS.find(([id]) => id === tab)?.[1] || "Home";

  return (
    <>
      <EducationContextReporter instituteName={instituteName} role="parent" />
      <div className="flex min-h-[calc(100vh-3.5rem)] w-full bg-background">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:block">
          <div className="p-4">
            <p className="font-serif text-base font-semibold">Education</p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{instituteName}</p>
            <nav className="mt-6 space-y-1">
              {ITEMS.map(([id, itemLabel, Icon]) => (
                <button key={id} type="button" onClick={() => setTab(id)} className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm", tab === id ? "bg-sidebar-active font-medium text-primary-foreground" : "text-muted-foreground hover:bg-muted/60")}>
                  <Icon className="h-3.5 w-3.5" /> {itemLabel}
                </button>
              ))}
            </nav>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Parent / guardian</p>
          <h1 className="mt-1 text-2xl font-semibold">{label}</h1>
          <div className="mt-5 rounded-xl border border-dashed border-border bg-card p-6">
            <p className="font-medium">Link a child to get started</p>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Once the institute approves your parent request and links a child, this page will show only that child&apos;s timetable, attendance, academics, fees, notices, and messages.
            </p>
            <button type="button" className="mt-4 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Add child with code</button>
          </div>
        </main>
      </div>
    </>
  );
}
