"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { GripVertical } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatUserName } from "@/components/user-identity";
import type { Member } from "@/lib/api";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";

type Section = { id: string; name: string; className?: string; classTeacherUserId?: string | null };
type SectionMapping = { teachers: Member[]; students: Member[] };
type EnrollmentModule = "teachers" | "students";

function rosterModuleFromUrl(raw: string | null): EnrollmentModule {
  return raw === "students" ? "students" : "teachers";
}

export function EnrollmentManager({
  instituteId,
  refreshKey = 0,
  onChanged,
  fixedModule,
  listTab = "teachers-classes",
  instituteTab,
  associationPanel,
  embedded = false,
  initialSectionId,
}: {
  instituteId: string;
  refreshKey?: number;
  onChanged?: () => void;
  fixedModule?: EnrollmentModule;
  listTab?: "teachers-classes" | "students-classes" | "association" | "classes";
  instituteTab?: "association";
  associationPanel?: "teachers" | "students";
  embedded?: boolean;
  initialSectionId?: string;
}) {
  const [sections, setSections] = useState<Section[]>([]);
  const [staff, setStaff] = useState<Member[]>([]);
  const [students, setStudents] = useState<Member[]>([]);
  const [mappings, setMappings] = useState<Record<string, SectionMapping>>({});
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [module, setModule] = useState<EnrollmentModule>(
    () => fixedModule ?? rosterModuleFromUrl(searchParams.get("enrollmentModule"))
  );
  const [selectedSectionId, setSelectedSectionId] = useState(
    initialSectionId || searchParams.get("section") || ""
  );
  const [personSearch, setPersonSearch] = useState(searchParams.get("q") || "");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const replaceEnrollmentQuery = useCallback(
    (patch: Record<string, string | undefined>) => {
      if (embedded) {
        router.replace(
          buildInstitutePathFromSearch(instituteId, searchParams, {
            tab: "classes",
            sectionId: patch.section ?? selectedSectionId,
            sectionTab: "roster",
            enrollmentModule: fixedModule ?? module,
            ...patch,
          })
        );
        return;
      }
      router.replace(
        buildInstitutePathFromSearch(instituteId, searchParams, {
          tab: instituteTab ?? listTab,
          associationPanel: instituteTab === "association" ? associationPanel : undefined,
          enrollmentModule: fixedModule ?? module,
          ...patch,
        })
      );
    },
    [
      associationPanel,
      embedded,
      fixedModule,
      instituteId,
      instituteTab,
      listTab,
      module,
      router,
      searchParams,
      selectedSectionId,
    ]
  );

  const load = useCallback(async () => {
    const [instituteRes, sectionRes, staffRes, studentRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/members?group=staff`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/members?group=students`, { credentials: "include" }),
    ]);
    if (instituteRes.ok) {
      const institute = await instituteRes.json();
      setCanManage(["owner", "admin", "principal"].includes(institute.role));
    }
    const nextSections = sectionRes.ok ? await sectionRes.json() : [];
    setSections(nextSections);
    const fromUrl = searchParams.get("section");
    if (fromUrl && nextSections.some((s: Section) => s.id === fromUrl)) {
      setSelectedSectionId(fromUrl);
    } else {
      setSelectedSectionId((current) => current || nextSections[0]?.id || "");
    }
    if (staffRes.ok) setStaff(await staffRes.json());
    if (studentRes.ok) setStudents(await studentRes.json());

    const rows = await Promise.all(
      nextSections.map(async (section: Section) => {
        const overviewRes = await fetch(`/api/sections/${section.id}`, { credentials: "include" });
        const overview = overviewRes.ok ? await overviewRes.json() : {};
        return [
          section.id,
          { teachers: overview.teachers ?? [], students: overview.students ?? [] },
        ] as const;
      })
    );
    setMappings(Object.fromEntries(rows));
  }, [instituteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch(() => setMessage("Could not load enrollment details."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, refreshKey]);

  useEffect(() => {
    if (!selectedSectionId || embedded) return;
    replaceEnrollmentQuery({
      section: selectedSectionId,
      enrollmentModule: module,
      q: personSearch.trim() || undefined,
    });
  }, [embedded, fixedModule, module, personSearch, replaceEnrollmentQuery, selectedSectionId]);

  useEffect(() => {
    if (initialSectionId) setSelectedSectionId(initialSectionId);
  }, [initialSectionId]);

  useEffect(() => {
    if (fixedModule) setModule(fixedModule);
  }, [fixedModule]);

  useEffect(() => {
    setSelectedUserIds([]);
  }, [module, selectedSectionId]);

  async function change(path: string, options: RequestInit = {}) {
    const res = await fetch(path, {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Request failed");
    await load();
  }

  async function update(path: string, body?: object) {
    try {
      await change(path, {
        method: body ? "POST" : "DELETE",
        body: body ? JSON.stringify(body) : undefined,
      });
      onChanged?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update enrollment.");
    }
  }

  return (
    <section className="space-y-4">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold">Enrollment</h1>
          <p className="mt-1 text-sm text-muted-foreground">Assign teachers and students to each class.</p>
        </div>
      )}
      <SectionFirstWorkspace
        embedded={embedded}
        instituteId={instituteId}
        sections={sections}
        staff={staff}
        students={students}
        mappings={mappings}
        selectedSectionId={selectedSectionId}
        setSelectedSectionId={setSelectedSectionId}
        module={module}
        setModule={setModule}
        hideModuleToggle={Boolean(fixedModule)}
        update={update}
        onReload={load}
        canManage={canManage}
        personSearch={personSearch}
        setPersonSearch={setPersonSearch}
        selectedUserIds={selectedUserIds}
        setSelectedUserIds={setSelectedUserIds}
        bulkLoading={bulkLoading}
        onBulkAssign={async (userIds) => {
          if (!selectedSectionId || !userIds.length) return;
          setBulkLoading(true);
          setMessage("");
          const memberType = module === "students" ? "student" : "teacher";
          let ok = 0;
          for (const userId of userIds) {
            const res = await fetch(`/api/sections/${selectedSectionId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ userId, memberType }),
            });
            if (res.ok) ok += 1;
          }
          setBulkLoading(false);
          setSelectedUserIds([]);
          if (ok) {
            setMessage(`Assigned ${ok} ${memberType}${ok === 1 ? "" : "s"}.`);
            await load();
            onChanged?.();
          } else {
            setMessage("Could not assign selected members.");
          }
        }}
      />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}

function SectionFirstWorkspace({
  instituteId,
  sections,
  staff,
  students,
  mappings,
  selectedSectionId,
  setSelectedSectionId,
  module,
  setModule,
  hideModuleToggle = false,
  embedded = false,
  update,
  onReload,
  canManage,
  personSearch,
  setPersonSearch,
  selectedUserIds,
  setSelectedUserIds,
  bulkLoading,
  onBulkAssign,
}: {
  instituteId: string;
  sections: Section[];
  staff: Member[];
  students: Member[];
  mappings: Record<string, SectionMapping>;
  selectedSectionId: string;
  setSelectedSectionId: (id: string) => void;
  embedded?: boolean;
  module: EnrollmentModule;
  setModule: (module: EnrollmentModule) => void;
  hideModuleToggle?: boolean;
  update: (path: string, body?: object) => void;
  onReload: () => Promise<void>;
  canManage: boolean;
  personSearch: string;
  setPersonSearch: (value: string) => void;
  selectedUserIds: string[];
  setSelectedUserIds: Dispatch<SetStateAction<string[]>>;
  bulkLoading: boolean;
  onBulkAssign: (userIds: string[]) => Promise<void>;
}) {
  const [classSearch, setClassSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const section = sections.find((item) => item.id === selectedSectionId);
  const mapping = section ? mappings[section.id] ?? { teachers: [], students: [] } : null;
  const people =
    module === "students"
      ? students
      : staff.filter((person) =>
          ["teacher", "lecturer", "professor", "principal"].includes(person.role)
        );
  const assigned = module === "students" ? mapping?.students ?? [] : mapping?.teachers ?? [];
  const moduleLabel = module === "students" ? "Students" : "Teachers";
  const dropHint =
    module === "students" ? "Drop students here to assign them." : "Drop teachers here to assign them.";
  const searchLower = personSearch.trim().toLowerCase();
  const classSearchLower = classSearch.trim().toLowerCase();
  const filteredSections = useMemo(() => {
    if (!classSearchLower) return sections;
    return sections.filter((item) => {
      const label = `${item.className || ""} ${item.name}`.toLowerCase();
      return label.includes(classSearchLower);
    });
  }, [sections, classSearchLower]);
  const filteredPeople = useMemo(() => {
    if (!searchLower) return people;
    return people.filter((person) => {
      const name = formatUserName(person).toLowerCase();
      const email = (person.email || "").toLowerCase();
      return name.includes(searchLower) || email.includes(searchLower);
    });
  }, [people, searchLower]);
  const selectableIds = filteredPeople
    .filter((person) => !assigned.some((item) => item.userId === person.userId))
    .map((person) => person.userId);

  function assign(userId: string) {
    if (!canManage || !section || assigned.some((person) => person.userId === userId)) return;
    update(`/api/sections/${section.id}`, {
      userId,
      memberType: module === "students" ? "student" : "teacher",
    });
  }

  function toggleSelected(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div
        className={
          embedded
            ? "grid gap-4 lg:grid-cols-[minmax(280px,1fr)_300px]"
            : "grid gap-4 lg:grid-cols-[200px_minmax(280px,1fr)_300px]"
        }
      >
        {!embedded && (
        <div className="lg:sticky lg:top-2 lg:self-start">
          <h2 className="px-1 text-sm font-semibold">Classes</h2>
          <input
            type="search"
            value={classSearch}
            onChange={(e) => setClassSearch(e.target.value)}
            placeholder="Filter classes"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="mt-2 max-h-[28rem] space-y-2 overflow-y-auto">
            {filteredSections.map((item) => {
              const itemMapping = mappings[item.id] ?? { teachers: [], students: [] };
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedSectionId(item.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    item.id === selectedSectionId
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-muted/40"
                  }`}
                >
                  <p className="font-semibold">{item.className || "Class"} · {item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {itemMapping.teachers.length} teachers · {itemMapping.students.length} students
                  </p>
                </button>
              );
            })}
            {!filteredSections.length && (
              <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                No classes match your filter.
              </p>
            )}
          </div>
        </div>
        )}

        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (canManage) setDragOver(true);
          }}
          onDragEnter={() => canManage && setDragOver(true)}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            setDragOver(false);
            const userId = event.dataTransfer.getData("userId");
            if (canManage && userId) assign(userId);
          }}
          className={`min-h-96 rounded-xl border-2 border-dashed p-4 transition ${
            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/10"
          }`}
        >
          {section && mapping ? (
            <>
              <h2 className="text-xl font-semibold">
                {section.className || "Class"} · {section.name}
              </h2>
              {canManage && <p className="mt-1 text-sm text-muted-foreground">{dropHint}</p>}
              {module === "teachers" && (
                <ClassTeacherPicker
                  instituteId={instituteId}
                  sectionId={section.id}
                  teachers={mapping.teachers}
                  classTeacherUserId={section.classTeacherUserId}
                  canManage={canManage}
                  onSaved={() => onReload().catch(() => undefined)}
                />
              )}
              <AssignedGroup
                label={moduleLabel}
                members={assigned}
                onRemove={
                  canManage
                    ? (id) => update(`/api/sections/${section.id}/members/${id}`)
                    : undefined
                }
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a class to begin.</p>
          )}
        </div>

        {canManage && (
          <div>
            {!hideModuleToggle && (
            <div className="flex flex-wrap gap-5 border-b border-border px-1 text-xs">
              <ModuleTab
                label="Teachers"
                active={module === "teachers"}
                onClick={() => setModule("teachers")}
              />
              <ModuleTab
                label="Students"
                active={module === "students"}
                onClick={() => setModule("students")}
              />
            </div>
            )}
            <input
              type="search"
              value={personSearch}
              onChange={(event) => setPersonSearch(event.target.value)}
              placeholder="Search by name or email"
              className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            {selectableIds.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedUserIds(
                      selectedUserIds.length === selectableIds.length ? [] : selectableIds
                    )
                  }
                  className="text-xs font-medium text-primary underline"
                >
                  {selectedUserIds.length === selectableIds.length ? "Clear selection" : "Select all"}
                </button>
                {selectedUserIds.length > 0 && section && (
                  <button
                    type="button"
                    disabled={bulkLoading}
                    onClick={() => void onBulkAssign(selectedUserIds)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
                  >
                    Add {selectedUserIds.length} to {section.className || "class"} · {section.name}
                  </button>
                )}
              </div>
            )}
            <div className="mt-3 max-h-[24rem] space-y-2 overflow-y-auto">
              {filteredPeople.map((person) => {
                const isAssigned = assigned.some((item) => item.userId === person.userId);
                const isSelected = selectedUserIds.includes(person.userId);
                return (
                  <div
                    key={person.userId}
                    draggable={!isAssigned}
                    onDragStart={(event) => event.dataTransfer.setData("userId", person.userId)}
                    className={`flex items-center justify-between gap-2 rounded-xl border bg-background p-3 ${
                      isAssigned ? "opacity-50" : "cursor-grab active:cursor-grabbing"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {!isAssigned && (
                        <>
                          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelected(person.userId)}
                            aria-label={`Select ${formatUserName(person)}`}
                          />
                        </>
                      )}
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
                        aria-hidden
                      >
                        {memberInitials(person)}
                      </span>
                      <span className="min-w-0 truncate text-sm">{formatUserName(person)}</span>
                      {isAssigned && (
                        <span className="text-[10px] text-muted-foreground">In class</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => assign(person.userId)}
                      disabled={isAssigned}
                      className="shrink-0 rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                );
              })}
              {!filteredPeople.length && (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No {module} match your search.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ClassTeacherPicker({
  instituteId,
  sectionId,
  teachers,
  classTeacherUserId,
  canManage,
  onSaved,
}: {
  instituteId: string;
  sectionId: string;
  teachers: Member[];
  classTeacherUserId?: string | null;
  canManage: boolean;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onChange(userId: string) {
    if (!canManage) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/class-teacher`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId: userId || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not update class teacher");
      return;
    }
    onSaved();
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-3">
      <label className="text-xs font-semibold text-muted-foreground" htmlFor={`ct-${sectionId}`}>
        Class teacher
      </label>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Assign subject teachers below so they can post daily notes. Optionally set a class teacher for attendance.
      </p>
      <select
        id={`ct-${sectionId}`}
        disabled={!canManage || saving || !teachers.length}
        value={classTeacherUserId || ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
      >
        <option value="">
          {teachers.length ? "Not set — any assigned teacher may post notes" : "Assign a teacher first"}
        </option>
        {teachers.map((teacher) => (
          <option key={teacher.userId} value={teacher.userId}>
            {formatUserName(teacher)}
          </option>
        ))}
      </select>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ModuleTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 pb-2.5 ${active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {label}
    </button>
  );
}

function AssignedGroup({
  label,
  members,
  onRemove,
}: {
  label: string;
  members: Member[];
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground">{members.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {members.map((member) => (
          <div
            key={member.userId}
            className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold"
                aria-hidden
              >
                {memberInitials(member)}
              </span>
              <span className="truncate">{formatUserName(member)}</span>
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(member.userId)}
                className="shrink-0 text-xs font-medium text-destructive"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {!members.length && (
          <p className="text-sm text-muted-foreground">None assigned yet — drag from the list or use Add.</p>
        )}
      </div>
    </div>
  );
}

function memberInitials(user: Member): string {
  const name = formatUserName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return "?";
}
