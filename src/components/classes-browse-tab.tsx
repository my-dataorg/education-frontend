"use client";

import { useEffect, useState } from "react";
import type { Member, Section } from "@/lib/api";
import { SectionWorkspace } from "@/components/section-workspace";

type SectionOverview = {
  sectionId: string;
  sectionName: string;
  className: string;
  studentCount: number;
  teacherCount: number;
  notesCount: number;
  averageCompletionPercent: number | null;
  assignments: Array<{
    id: string;
    title: string;
    description: string;
    assignmentType: "assignment" | "test";
    dueDate: string | null;
    submittedCount: number;
    enrolledStudents: number;
    completionPercent: number;
  }>;
  students?: Member[];
  teachers?: Member[];
};

function sectionLabel(section: Section, overview?: SectionOverview) {
  const students = overview?.studentCount;
  const base = `${section.className || "Class"} · ${section.name}`;
  return students != null ? `${base} (${students} students)` : base;
}

export function ClassesBrowseTab({
  instituteId,
  sections: initialSections,
  workspaceRole,
  loadAllSections = false,
  sectionWorkspaceTab = "overview",
}: {
  instituteId: string;
  sections: Section[];
  workspaceRole: "teacher" | "student" | "owner";
  loadAllSections?: boolean;
  sectionWorkspaceTab?: "overview" | "students" | "assignments";
}) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [selectedSectionId, setSelectedSectionId] = useState(initialSections[0]?.id || "");
  const [overviews, setOverviews] = useState<Record<string, SectionOverview>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(loadAllSections);

  useEffect(() => {
    if (!loadAllSections) {
      setSections(initialSections);
      return;
    }
    setLoading(true);
    fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include", cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Could not load classes");
        return r.json() as Promise<Section[]>;
      })
      .then((rows) => setSections(rows))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load classes"))
      .finally(() => setLoading(false));
  }, [instituteId, initialSections, loadAllSections]);

  useEffect(() => {
    if (!sections.length) {
      setSelectedSectionId("");
      return;
    }
    if (!sections.some((s) => s.id === selectedSectionId)) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId]);

  useEffect(() => {
    if (!sections.length) return;
    Promise.all(
      sections.map((section) =>
        fetch(`/api/sections/${section.id}`, { credentials: "include", cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null
        )
      )
    )
      .then((rows) => {
        setOverviews(
          Object.fromEntries(
            sections
              .map((section, index) => [section.id, rows[index] as SectionOverview | null])
              .filter(([, row]) => row != null) as [string, SectionOverview][]
          )
        );
      })
      .catch(() => setOverviews({}));
  }, [sections]);

  const selectedSection = sections.find((s) => s.id === selectedSectionId);
  const selectedOverview = selectedSectionId ? overviews[selectedSectionId] : undefined;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Classes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {loadAllSections ? "All class sections in this institute." : "Your class sections."}
          </p>
        </div>
        {sections.length > 0 && (
          <label className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[14rem] sm:items-end">
            <span className="text-xs font-medium text-muted-foreground">Class</span>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {sectionLabel(section, overviews[section.id])}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {loading && <p className="text-sm text-muted-foreground">Loading classes…</p>}

      {!loading && !sections.length && (
        <p className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">
          No classes {loadAllSections ? "in this institute yet." : "assigned to you yet."}
        </p>
      )}

      {selectedSection && selectedOverview ? (
        <SectionWorkspace
          key={`${selectedSection.id}-${sectionWorkspaceTab}`}
          instituteId={instituteId}
          sectionId={selectedSection.id}
          role={workspaceRole === "owner" ? "teacher" : workspaceRole}
          initialTab={sectionWorkspaceTab}
          overview={selectedOverview}
          assignments={selectedOverview.assignments}
          notes={[]}
        />
      ) : (
        selectedSection &&
        !selectedOverview && (
          <p className="text-sm text-muted-foreground">Loading class details…</p>
        )
      )}
    </div>
  );
}
