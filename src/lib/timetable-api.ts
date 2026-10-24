/** Normalize timetable JSON from the education API (camelCase) for UI components. */

export type MemberTimetableCell = {
  day: number;
  periodNo: number;
  subjectName?: string;
  teacherName?: string;
  sectionId?: string;
  room?: string | null;
};

export type TimetablePeriodKind = "class" | "break" | "lunch" | "play";

export type MemberTimetableData = {
  publishedAt?: string | null;
  periods: {
    periodNo: number;
    slotId?: string;
    start: string;
    end: string;
    kind: TimetablePeriodKind;
    label?: string;
  }[];
  days: { day: number; isWorking: boolean }[];
  cells: MemberTimetableCell[];
};

export function parseMemberTimetable(raw: Record<string, unknown>): MemberTimetableData {
  const periods = ((raw.periods as unknown[]) ?? []).map((p) => {
    const row = p as Record<string, unknown>;
    const rawKind = String(row.kind ?? "class");
    const kind: TimetablePeriodKind =
      rawKind === "instruction" || rawKind === "class"
        ? "class"
        : rawKind === "break" || rawKind === "lunch" || rawKind === "play"
          ? rawKind
          : "break";
    return {
      periodNo: Number(row.periodNo ?? row.period_no),
      slotId: (row.slotId ?? row.slot_id) as string | undefined,
      start: String(row.start ?? ""),
      end: String(row.end ?? ""),
      kind,
      label: (row.label as string | undefined) ?? undefined,
    };
  });
  const days = ((raw.days as unknown[]) ?? []).map((d) => {
    const row = d as Record<string, unknown>;
    return {
      day: Number(row.day),
      isWorking: Boolean(row.isWorking ?? row.is_working),
    };
  });
  const cells = ((raw.cells as unknown[]) ?? []).map((c) => {
    const row = c as Record<string, unknown>;
    return {
      day: Number(row.day),
      periodNo: Number(row.periodNo ?? row.period_no),
      subjectName: (row.subjectName ?? row.subject_name) as string | undefined,
      teacherName: (row.teacherName ?? row.teacher_name) as string | undefined,
      sectionId: (row.sectionId ?? row.section_id) as string | undefined,
      room: row.room as string | null | undefined,
    };
  });
  return {
    publishedAt: (raw.publishedAt ?? raw.published_at) as string | null | undefined,
    periods,
    days,
    cells,
  };
}

export type OwnerTimetablePayload = {
  periods: {
    period_no: number;
    slot_id?: string;
    start: string;
    end: string;
    kind: TimetablePeriodKind;
    label?: string;
  }[];
  days: { day: number; is_working: boolean; half_day?: boolean }[];
  cells: {
    day: number;
    period_no: number;
    subject_id: string | null;
    subject_name?: string | null;
    teacher_id: string | null;
    teacher_name?: string | null;
    room: string | null;
    status: "ok" | "clash" | "empty" | "locked";
    clash_reason?: string | null;
    locked?: boolean;
    cell_source?: "class_override" | "school_default" | null;
  }[];
  draft_saved_at?: string | null;
  published_at?: string | null;
  changed_since_publish?: boolean;
  settings_summary?: string | null;
};

export function parseOwnerTimetable(raw: Record<string, unknown>): OwnerTimetablePayload {
  const periods = ((raw.periods as unknown[]) ?? []).map((p) => {
    const row = p as Record<string, unknown>;
    const rawKind = String(row.kind ?? "class");
    const kind: TimetablePeriodKind =
      rawKind === "instruction" || rawKind === "class"
        ? "class"
        : rawKind === "break" || rawKind === "lunch" || rawKind === "play"
          ? rawKind
          : "break";
    return {
      period_no: Number(row.periodNo ?? row.period_no),
      slot_id: (row.slotId ?? row.slot_id) as string | undefined,
      start: String(row.start ?? ""),
      end: String(row.end ?? ""),
      kind,
      label: (row.label as string | undefined) ?? undefined,
    };
  });
  const days = ((raw.days as unknown[]) ?? []).map((d) => {
    const row = d as Record<string, unknown>;
    return {
      day: Number(row.day),
      is_working: Boolean(row.isWorking ?? row.is_working),
      half_day: Boolean(row.halfDay ?? row.half_day),
    };
  });
  const cells = ((raw.cells as unknown[]) ?? []).map((c) => {
    const row = c as Record<string, unknown>;
    const status = String(row.status ?? "ok");
    return {
      day: Number(row.day),
      period_no: Number(row.periodNo ?? row.period_no),
      subject_id: (row.subjectId ?? row.subject_id ?? null) as string | null,
      subject_name: (row.subjectName ?? row.subject_name) as string | null | undefined,
      teacher_id: (row.teacherId ?? row.teacher_id ?? null) as string | null,
      teacher_name: (row.teacherName ?? row.teacher_name) as string | null | undefined,
      room: (row.room ?? null) as string | null,
      status: status as "ok" | "clash" | "empty" | "locked",
      clash_reason: (row.clashReason ?? row.clash_reason) as string | null | undefined,
      locked: Boolean(row.locked),
      cell_source: (row.cellSource ?? row.cell_source) as
        | "class_override"
        | "school_default"
        | null
        | undefined,
    };
  });
  return {
    periods,
    days,
    cells,
    draft_saved_at: (raw.draftSavedAt ?? raw.draft_saved_at) as string | null | undefined,
    published_at: (raw.publishedAt ?? raw.published_at) as string | null | undefined,
    changed_since_publish: Boolean(raw.changedSincePublish ?? raw.changed_since_publish),
    settings_summary: (raw.settingsSummary ?? raw.settings_summary) as string | null | undefined,
  };
}
