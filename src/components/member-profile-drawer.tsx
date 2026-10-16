"use client";

import { useEffect, useState } from "react";
import { UserIdentity } from "@/components/user-identity";
import { ROLE_LABELS } from "@/lib/roles";

type Profile = {
  userId: string;
  role: string;
  sections: Array<{
    sectionId: string;
    sectionName: string;
    className?: string;
    branchName?: string | null;
    memberType?: string | null;
  }>;
  branches: string[];
};

export function MemberProfileDrawer({
  instituteId,
  userId,
  userPreview,
  onClose,
}: {
  instituteId: string;
  userId: string | null;
  userPreview?: { userId: string; displayName?: string; username?: string; role?: string };
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`/api/institutes/${instituteId}/members/${userId}/profile`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load profile");
        setProfile(await response.json());
      })
      .catch((reason) => {
        setProfile(null);
        setError(reason instanceof Error ? reason.message : "Could not load profile");
      })
      .finally(() => setLoading(false));
  }, [instituteId, userId]);

  if (!userId) {
    return (
      <aside className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Select a person from the roster to view their profile.
      </aside>
    );
  }

  const sectionLine = profile?.sections
    .map((s) => `${s.className || "Class"}-${s.sectionName}`)
    .join(", ");

  return (
    <aside className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">Member profile</h2>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Close ×
        </button>
      </div>
      <div className="mt-4">
        {userPreview ? (
          <UserIdentity user={userPreview} role={userPreview.role || profile?.role} />
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {ROLE_LABELS[profile?.role || userPreview?.role || ""] || profile?.role || "—"}
          {sectionLine ? ` · ${sectionLine}` : ""}
        </p>
      </div>
      {loading && <p className="mt-4 text-sm text-muted-foreground">Loading profile…</p>}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {profile && !loading && (
        <div className="mt-4 space-y-3 text-xs">
          <div>
            <p className="text-[11px] text-muted-foreground">Campuses</p>
            <p>{profile.branches.length ? profile.branches.join(", ") : "—"}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Sections</p>
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
