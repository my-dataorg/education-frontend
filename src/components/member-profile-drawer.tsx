"use client";

import { useEffect, useState } from "react";
import { UserIdentity } from "@/components/user-identity";
import { ROLE_LABELS } from "@/lib/roles";

type Profile = {
  userId: string;
  role: string;
  displayName?: string;
  email?: string;
  sections: Array<{
    sectionId: string;
    sectionName: string;
    className?: string;
    branchName?: string | null;
    memberType?: string | null;
  }>;
  branches: string[];
  dateOfBirth?: string | null;
  gender?: string | null;
  classLabel?: string | null;
  admissionNo?: string | null;
};

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const MOTHER_TONGUES = ["Telugu", "Hindi", "English", "Urdu", "Tamil", "Kannada", "Marathi", "Other"];

export function MemberProfileDrawer({
  instituteId,
  userId,
  userPreview,
  onClose,
}: {
  instituteId: string;
  userId: string | null;
  userPreview?: { userId: string; displayName?: string; username?: string; role?: string; kind?: string };
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [motherTongue, setMotherTongue] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [address, setAddress] = useState("");
  const [penNo, setPenNo] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const isStudent =
    userPreview?.kind === "student" || profile?.role === "student";

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setError("");
    setSavedMessage("");
    fetch(`/api/institutes/${instituteId}/members/${userId}/profile`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load profile");
        const data = (await response.json()) as Profile;
        setProfile(data);
        setGender(data.gender || "");
      })
      .catch((reason) => {
        setProfile(null);
        setError(reason instanceof Error ? reason.message : "Could not load profile");
      })
      .finally(() => setLoading(false));
  }, [instituteId, userId]);

  if (!userId) {
    return (
      <aside className="hidden rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground lg:block">
        Select a person from the roster to view their profile.
      </aside>
    );
  }

  const title = isStudent ? "Student profile" : "Member profile";
  const roleLabel = ROLE_LABELS[profile?.role || userPreview?.role || ""] || profile?.role || "—";

  function onSave() {
    setSavedMessage("Profile details will sync when student records are enabled for this institute.");
    setTimeout(() => setSavedMessage(""), 4000);
  }

  return (
    <aside className="sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Close ✕
        </button>
      </div>
      <div className="mt-4">
        {userPreview ? (
          <UserIdentity user={userPreview} role={userPreview.role || profile?.role} />
        ) : null}
        {!isStudent && (
          <p className="mt-1 text-xs text-muted-foreground">
            {roleLabel}
            {profile?.classLabel ? ` · ${profile.classLabel}` : ""}
          </p>
        )}
      </div>
      {loading && <p className="mt-4 text-sm text-muted-foreground">Loading profile…</p>}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {savedMessage && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {savedMessage}
        </p>
      )}

      {isStudent && profile && !loading && (
        <div className="mt-4 space-y-3 text-sm">
          <Field label="Class and roll" readOnly value={profile.classLabel || "—"} />
          <Field label="Admission number" readOnly value={profile.admissionNo || "—"} />
          <label className="block text-xs">
            <span className="text-muted-foreground">Date of birth</span>
            <input
              type="date"
              value={profile.dateOfBirth || ""}
              readOnly
              className="mt-1 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="text-muted-foreground">Gender</span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="text-muted-foreground">Blood group</span>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="text-muted-foreground">Mother tongue</span>
            <select
              value={motherTongue}
              onChange={(e) => setMotherTongue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {MOTHER_TONGUES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="text-muted-foreground">Guardian name</span>
            <input
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="text-muted-foreground">Guardian phone</span>
            <input
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              placeholder="+91"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="text-muted-foreground">Address</span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="text-muted-foreground">PEN / APAAR number</span>
            <input
              value={penNo}
              onChange={(e) => setPenNo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div>
            <p className="text-xs text-muted-foreground">Documents</p>
            <ul className="mt-2 space-y-2 text-xs">
              <DocumentRow name="Birth certificate" status="missing" />
              <DocumentRow name="Transfer certificate" status="uploaded" />
            </ul>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={onSave}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              Save
            </button>
            <button
              type="button"
              disabled
              title="No published results yet"
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium opacity-50"
            >
              View report card
            </button>
          </div>
        </div>
      )}

      {profile && !loading && !isStudent && (
        <div className="mt-4 space-y-3 text-xs">
          <Field label="Email" readOnly value={profile.email || "—"} />
          <Field label="Campuses" readOnly value={profile.branches.length ? profile.branches.join(", ") : "—"} />
          <div>
            <p className="text-muted-foreground">Sections / assignments</p>
            {profile.sections.length ? (
              <ul className="mt-1 space-y-1">
                {profile.sections.map((section) => (
                  <li key={section.sectionId}>
                    {section.className}-{section.sectionName}
                    {section.memberType ? ` (${section.memberType})` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p>—</p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function Field({ label, value, readOnly }: { label: string; value: string; readOnly?: boolean }) {
  return (
    <label className="block text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input
        readOnly={readOnly}
        value={value}
        className="mt-1 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
      />
    </label>
  );
}

function DocumentRow({ name, status }: { name: string; status: "missing" | "uploaded" }) {
  const isMissing = status === "missing";
  return (
    <li className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span>{name}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
          isMissing ? "bg-amber-50 text-amber-800" : "bg-primary/10 text-primary"
        }`}
      >
        {isMissing ? "Missing" : "Uploaded"}
      </span>
    </li>
  );
}
