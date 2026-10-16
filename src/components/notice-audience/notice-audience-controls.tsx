"use client";

import type { Section } from "@/lib/api";
import { MemberAudiencePicker } from "@/components/notice-audience/member-audience-picker";

export const AUDIENCE_OPTIONS = [
  { value: "everyone", label: "Everyone in the institute" },
  { value: "staff", label: "All staff" },
  { value: "teachers", label: "All teachers" },
  { value: "principals", label: "Principals only" },
  { value: "students", label: "All students" },
  { value: "boys", label: "Boys (male students)" },
  { value: "girls", label: "Girls (female students)" },
  { value: "parents", label: "All parents / guardians" },
  { value: "class", label: "Selected class section(s)" },
  { value: "custom", label: "Specific people" },
  { value: "distribution_list", label: "Saved distribution list" },
] as const;

export type AudienceTargeting = {
  audience: string;
  selectedSectionIds: string[];
  targetUserIds: string[];
  distributionListId: string;
};

type DistributionList = {
  id: string;
  name: string;
};

type Props = {
  instituteId: string;
  branchId?: string | null;
  sections: Section[];
  lists: DistributionList[];
  value: AudienceTargeting;
  onChange: (patch: Partial<AudienceTargeting>) => void;
  idPrefix?: string;
};

export function audiencePayload(value: AudienceTargeting) {
  return {
    audience: value.audience,
    targetSectionIds:
      value.audience === "class" || value.audience === "boys" || value.audience === "girls"
        ? value.selectedSectionIds
        : [],
    targetUserIds: value.audience === "custom" ? value.targetUserIds : [],
    distributionListId: value.audience === "distribution_list" ? value.distributionListId || null : null,
    studentGender:
      value.audience === "boys" ? "male" : value.audience === "girls" ? "female" : null,
  };
}

export function NoticeAudienceControls({
  instituteId,
  branchId,
  sections,
  lists,
  value,
  onChange,
  idPrefix = "audience",
}: Props) {
  const sortedSections = [...sections].sort((a, b) =>
    `${a.className}-${a.name}`.localeCompare(`${b.className}-${b.name}`, undefined, { numeric: true })
  );
  const showSectionPicker =
    value.audience === "class" || value.audience === "boys" || value.audience === "girls";

  function toggleSection(sectionId: string) {
    const next = value.selectedSectionIds.includes(sectionId)
      ? value.selectedSectionIds.filter((id) => id !== sectionId)
      : [...value.selectedSectionIds, sectionId];
    onChange({ selectedSectionIds: next });
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground" htmlFor={`${idPrefix}-select`}>
        Send to
        <select
          id={`${idPrefix}-select`}
          value={value.audience}
          onChange={(e) => onChange({ audience: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
        >
          {AUDIENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>

      {value.audience === "distribution_list" && (
        <label className="block text-xs font-medium text-muted-foreground">
          Distribution list
          <select
            value={value.distributionListId}
            onChange={(e) => onChange({ distributionListId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="">Choose a list</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>{list.name}</option>
            ))}
          </select>
        </label>
      )}

      {showSectionPicker && (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Class sections {value.audience !== "class" ? "(optional)" : ""}
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm">
            {sortedSections.map((section) => (
              <li key={section.id}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value.selectedSectionIds.includes(section.id)}
                    onChange={() => toggleSection(section.id)}
                  />
                  {section.className}-{section.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {value.audience === "custom" && (
        <MemberAudiencePicker
          instituteId={instituteId}
          branchId={branchId}
          selectedUserIds={value.targetUserIds}
          onChange={(ids) => onChange({ targetUserIds: ids })}
        />
      )}
    </div>
  );
}
