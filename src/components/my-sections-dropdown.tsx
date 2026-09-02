"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Section } from "@/lib/api";
import { classSectionLabel } from "@/lib/utils";

export function MySectionsDropdown({
  instituteId,
  sections,
}: {
  instituteId: string;
  sections: Section[];
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative w-[13.5rem] shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2 text-left shadow-sm transition hover:border-primary/30 hover:bg-muted/40"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            My sections
          </span>
          <span className="mt-0.5 block truncate text-sm font-medium">
            {sections.length === 0 ? "No classes assigned" : "Select a class"}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute inset-x-0 z-40 mt-2 overflow-hidden rounded-xl border border-border bg-card py-1.5 shadow-xl"
        >
          {sections.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              You are not assigned to any classes yet. Ask your admin to enroll you.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {sections.map((section) => (
                <li key={section.id}>
                  <Link
                    href={`/institutes/${instituteId}/sections/${section.id}`}
                    role="option"
                    onClick={() => setOpen(false)}
                    className="block px-3.5 py-2.5 transition hover:bg-muted/70"
                  >
                    <span className="block truncate text-sm font-medium">
                      {classSectionLabel(section.className, section.name) || section.name}
                    </span>
                    {section.subjectNames && section.subjectNames.length > 0 && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {section.subjectNames.join(", ")}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
