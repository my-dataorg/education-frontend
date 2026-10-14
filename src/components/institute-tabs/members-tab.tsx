"use client";

import { useState } from "react";
import { FileDown, FileUp, Search } from "lucide-react";
import { IncomingRequestsPanel } from "@/components/incoming-requests-panel";
import { InstitutePeoplePanel } from "@/components/institute-people-panel";
import { InviteMembersButton } from "@/components/invite-members-modal";
import { MembershipActions } from "@/components/membership-actions";
import type { InstituteSummary } from "@/lib/api";

type Props = {
  instituteId: string;
  joinCode: string;
  branches: InstituteSummary["branches"];
  selectedBranchId: string | null;
  currentUserId: string;
  inviteRefreshKey: number;
  onChanged: () => void;
};

export function MembersTab({
  instituteId,
  joinCode,
  branches,
  selectedBranchId,
  currentUserId,
  inviteRefreshKey,
  onChanged,
}: Props) {
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);
  const staffCount = selectedBranch?.teacherCount ?? 0;
  const studentCount = selectedBranch?.studentCount ?? 0;
  const [search, setSearch] = useState("");
  const [memberType, setMemberType] = useState("all");
  const [memberStatus, setMemberStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  function selectTab(tab: string) {
    setActiveTab(tab);
    setMemberType(tab === "staff" ? "staff" : tab === "students" ? "student" : tab === "parents" ? "parent" : "all");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Institute workspace</p>
          <h1 className="mt-1 text-2xl font-semibold">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage staff, students, guardians, invitations, and join requests.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled title="CSV import is not connected yet" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium opacity-60">
            <FileUp className="h-3.5 w-3.5" /> Bulk import CSV
          </button>
          <button type="button" disabled title="Export is not connected yet" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium opacity-60">
            <FileDown className="h-3.5 w-3.5" /> Export
          </button>
          <InviteMembersButton
            instituteId={instituteId}
            onSent={onChanged}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-5 border-b border-border px-1 text-xs">
        <MemberTab label="All" value={staffCount + studentCount} active={activeTab === "all"} onClick={() => selectTab("all")} />
        <MemberTab label="Staff" value={staffCount} active={activeTab === "staff"} onClick={() => selectTab("staff")} />
        <MemberTab label="Students" value={studentCount} active={activeTab === "students"} onClick={() => selectTab("students")} />
        <MemberTab label="Parents" value="—" active={activeTab === "parents"} onClick={() => selectTab("parents")} />
        <MemberTab label="Requests" value="—" active={activeTab === "requests"} onClick={() => selectTab("requests")} />
        <MemberTab label="Invitations sent" value="—" active={activeTab === "invitations"} onClick={() => selectTab("invitations")} />
      </div>

      {["all", "staff", "students", "parents"].includes(activeTab) && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            aria-label="Search members"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, admission no., phone"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="sr-only" htmlFor="member-type">Member type</label>
        <select id="member-type" value={memberType} onChange={(event) => setMemberType(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="all">All types</option>
          <option value="staff">Staff</option>
          <option value="student">Students</option>
          <option value="parent">Parents</option>
        </select>
        <label className="sr-only" htmlFor="member-status">Member status</label>
        <select id="member-status" value={memberStatus} onChange={(event) => setMemberStatus(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
        </select>
      </div>}

      {["all", "staff", "students"].includes(activeTab) && <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)]">
        {selectedBranchId && (
          <InstitutePeoplePanel
            instituteId={instituteId}
            branches={branches}
            branchId={selectedBranchId}
            canManage
            currentUserId={currentUserId}
            refreshKey={inviteRefreshKey}
            searchQuery={search}
            memberType={memberType}
            memberStatus={memberStatus}
            onChanged={onChanged}
          />
        )}
        <StudentProfilePreview student={selectedBranch?.students?.find((person) => person.role === "student")} />
      </div>}

      {activeTab === "parents" && <EmptyTab title="Parents" message="Guardian links will appear here when parents are linked to students." />}
      {activeTab === "invitations" && <MembershipActions instituteId={instituteId} joinCode={joinCode} onChanged={onChanged} />}
      {activeTab === "requests" && <IncomingRequestsPanel instituteId={instituteId} canManage refreshKey={inviteRefreshKey} onChanged={onChanged} />}
    </div>
  );
}

function MemberTab({ label, value, active = false, onClick }: { label: string; value: number | string; active?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`border-b-2 pb-2.5 ${active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {label} · {value}
    </button>
  );
}

function EmptyTab({ title, message }: { title: string; message: string }) {
  return <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{message}</p></section>;
}

function StudentProfilePreview({ student }: { student?: { displayName?: string; username?: string; role?: string } }) {
  const name = student?.displayName || student?.username || "Select a student";
  return (
    <aside className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <h2 className="font-semibold">Student profile</h2>
        <span className="text-xs text-muted-foreground">Close ×</span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-muted" />
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{student ? "7-A · Roll [#] · Admission [###]" : "Choose a student from the roster"}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {["Date of birth", "Gender", "Blood group", "Mother tongue", "Guardian name and phone", "Address", "PEN / APAAR no.", "Category"].map((field) => (
          <div key={field} className={field === "Guardian name and phone" || field === "Address" ? "sm:col-span-2" : ""}>
            <p className="text-[11px] text-muted-foreground">{field}</p>
            <div className="mt-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">Not provided</div>
          </div>
        ))}
      </div>
      <h3 className="mt-5 text-sm font-semibold">Documents</h3>
      <div className="mt-2 space-y-2 text-xs">
        <div className="flex justify-between"><span>Birth certificate</span><span className="text-amber-700">Missing</span></div>
        <div className="flex justify-between"><span>Transfer certificate</span><span className="text-emerald-700">Uploaded</span></div>
      </div>
      <div className="mt-5 flex gap-2">
        <button type="button" className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground">Save</button>
        <button type="button" className="rounded-lg border border-border px-3 py-2 text-xs">View report card</button>
      </div>
    </aside>
  );
}
