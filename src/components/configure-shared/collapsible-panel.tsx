"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsiblePanel({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm xl:p-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-border p-4 text-left xl:pointer-events-none xl:mb-4 xl:cursor-default xl:border-0 xl:p-0"
      >
        <h2 className="font-semibold">{title}</h2>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform xl:hidden ${
            open ? "" : "-rotate-90"
          }`}
          aria-hidden
        />
      </button>
      <div
        className={`px-4 pb-4 pt-0 xl:px-0 xl:pb-0 ${open ? "block" : "hidden"} border-t border-border xl:block xl:border-t-0`}
      >
        {children}
      </div>
    </section>
  );
}
