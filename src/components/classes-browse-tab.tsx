"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Member, Section } from "@/lib/api";
import { SectionWorkspace, type SectionWorkspaceTab } from "@/components/section-workspace";
import { useRegisterClassesMobileHeader } from "@/components/classes-mobile-header";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";

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

function sectionLabelShort(section: Section, overview?: SectionOverview) {
  const n = overview?.studentCount;
  const base = `${section.className || "Class"}-${section.name}`;
  return n != null ? `${base} (${n})` : base;
}

export function ClassesBrowseTab({
  instituteId,
  sections: initialSections,
  workspaceRole,
  loadAllSections = false,
  sectionWorkspaceTab = "overview",
  fitTimetable = false,
  fitRoster = false,
  fitAttendance = false,
  fitSubjects = false,
  fitSyllabus = false,
  fitClassBoard = false,
}: {
  instituteId: string;
  sections: Section[];
  workspaceRole: "teacher" | "student" | "owner" | "admin" | "principal";
  loadAllSections?: boolean;
  sectionWorkspaceTab?: SectionWorkspaceTab;
  fitTimetable?: boolean;
  fitRoster?: boolean;
  fitAttendance?: boolean;
  fitSubjects?: boolean;
  fitSyllabus?: boolean;
  fitClassBoard?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSectionId = searchParams.get("sectionId");
  const rawSectionTab = searchParams.get("sectionTab") as SectionWorkspaceTab | null;
  const urlSectionTab =
    rawSectionTab === "notes"
      ? "class-board"
      : rawSectionTab || sectionWorkspaceTab || "overview";

  const [sections, setSections] = useState<Section[]>(initialSections);
  const [selectedSectionId, setSelectedSectionId] = useState(
    urlSectionId || initialSections[0]?.id || ""
  );
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
    if (urlSectionId && sections.some((s) => s.id === urlSectionId)) {
      setSelectedSectionId(urlSectionId);
      return;
    }
    if (!sections.some((s) => s.id === selectedSectionId)) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId, urlSectionId]);

  function syncClassesUrl(sectionId: string, sectionTab?: SectionWorkspaceTab) {
    router.replace(
      buildInstitutePathFromSearch(instituteId, searchParams, {
        tab: "classes",
        sectionId,
        sectionTab: sectionTab ?? urlSectionTab,
      })
    );
  }

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

  useRegisterClassesMobileHeader(
    () =>
      sections.length ? (
        <select
          value={selectedSectionId}
          onChange={(e) => {
            setSelectedSectionId(e.target.value);
            syncClassesUrl(e.target.value);
          }}
          className="w-full min-w-0 truncate rounded-md border border-border bg-background px-2 py-1 text-xs font-medium"
          aria-label="Select class"
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {sectionLabelShort(section, overviews[section.id])}
            </option>
          ))}
        </select>
      ) : null,
    [sections, selectedSectionId, overviews]
  );

  const stretchTimetable =
    fitTimetable && urlSectionTab === "timetable" && !!selectedSection && !!selectedOverview;
  const stretchRoster =
    fitRoster && urlSectionTab === "roster" && !!selectedSection && !!selectedOverview;
  const stretchAttendance =
    fitAttendance && urlSectionTab === "attendance" && !!selectedSection && !!selectedOverview;
  const stretchSubjects =
    fitSubjects && urlSectionTab === "subjects" && !!selectedSection && !!selectedOverview;
  const stretchSyllabus =
    fitSyllabus && urlSectionTab === "syllabus" && !!selectedSection && !!selectedOverview;
  const stretchClassBoard =
    fitClassBoard && urlSectionTab === "class-board" && !!selectedSection && !!selectedOverview;
  const stretchGrid =
    stretchClassBoard ||
    stretchTimetable ||
    stretchRoster ||
    stretchAttendance ||
    stretchSubjects ||
    stretchSyllabus;

  return (
    <div
      className={
        stretchClassBoard
          ? "flex min-h-0 flex-1 flex-col gap-1 overflow-hidden"
          : stretchGrid
            ? "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden max-md:gap-3 max-md:overflow-visible max-md:flex-none"
            : "mt-0 space-y-0 sm:mt-4 sm:space-y-4"
      }
    >
      <div
        className={`hidden shrink-0 md:flex md:flex-row md:items-center md:justify-between ${
          stretchGrid ? "gap-2 py-0" : "md:items-start"
        }`}
      >
        <div className={stretchGrid ? "min-w-0" : undefined}>
          <h2 className={stretchGrid ? "text-lg font-semibold leading-tight" : "text-xl font-semibold"}>
            Classes
          </h2>
          {!stretchGrid && (
            <p className="mt-1 text-sm text-muted-foreground">
              {loadAllSections ? "All class sections in this institute." : "Your class sections."}
            </p>
          )}
        </div>
        {sections.length > 0 && (
          <label className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[14rem] sm:items-end">
            <span className="text-xs font-medium text-muted-foreground">Class</span>
            <select
              value={selectedSectionId}
              onChange={(e) => {
            setSelectedSectionId(e.target.value);
            syncClassesUrl(e.target.value);
          }}
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
          key={`${selectedSection.id}-${urlSectionTab}`}
          instituteId={instituteId}
          sectionId={selectedSection.id}
          role={workspaceRole}
          initialTab={urlSectionTab}
          onTabChange={(tab) => syncClassesUrl(selectedSection.id, tab)}
          overview={selectedOverview}
          assignments={selectedOverview.assignments}
          notes={[]}
          fillTimetable={stretchTimetable}
          fillRoster={stretchRoster}
          fillAttendance={stretchAttendance}
          fillSubjects={stretchSubjects}
          fillSyllabus={stretchSyllabus}
          fillClassBoard={stretchClassBoard}
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
