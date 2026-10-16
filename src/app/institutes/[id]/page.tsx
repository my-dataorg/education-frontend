import { auth } from "@/auth";
import { eduApi, type InstituteSummary, type Section } from "@/lib/api";
import { MANAGE_ROLES } from "@/lib/roles";
import { redirect } from "next/navigation";
import { EduNavGate } from "@/components/edu-nav-gate";
import { InstituteDashboard } from "@/components/institute-dashboard";
import { isSubscriptionError, SubscriptionRequired } from "@/components/subscription-required";
import { Suspense } from "react";
import { TeacherWorkspace } from "@/components/teacher-workspace";
import { StudentWorkspace, type StudentTab } from "@/components/student-workspace";
import { ParentWorkspace } from "@/components/parent-workspace";
import type { TeacherTab } from "@/components/teacher-shell";

export default async function InstitutePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string; tab?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const { institutes, error: listError } = await eduApi.listInstitutesSafe(session.accessToken);

  if (listError && isSubscriptionError(listError)) {
    return (
      <SubscriptionRequired description="You may have joined an institute already. Subscribe to Education to open your institute dashboard." />
    );
  }

  if (listError) {
    return (
      <>
        <EduNavGate />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {listError}
          </p>
        </main>
      </>
    );
  }

  const institute = institutes.find((i) => i.id === id);
  if (!institute) redirect("/institutes");

  const canManage = MANAGE_ROLES.has(institute.role);
  const showStaffDashboard = canManage || institute.role === "principal";

  if (showStaffDashboard) {
    let detail;
    let summary: InstituteSummary | null = null;
    let pageError = "";

    try {
      [detail, summary] = await Promise.all([
        eduApi.getInstitute(session.accessToken, id),
        eduApi.getSummary(session.accessToken, id),
      ]);
    } catch (e) {
      pageError = e instanceof Error ? e.message : "Failed to load institute";
    }

    if (pageError && isSubscriptionError(pageError)) {
      return (
        <SubscriptionRequired description="Subscribe to Education to access the institute dashboard." />
      );
    }

    if (pageError || !detail) {
      return (
        <>
          <EduNavGate />
          <main className="mx-auto max-w-5xl px-6 py-8">
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pageError || "Failed to load institute"}
            </p>
          </main>
        </>
      );
    }

    return (
      <div className="education-app-root">
        <EduNavGate />
        <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading...</div>}>
          <InstituteDashboard
            instituteId={id}
            detail={detail}
            summary={summary}
            canManage={canManage}
            currentUserId={session.user?.id || ""}
            currentUserName={session.user?.name || session.user?.email || "Owner"}
          />
        </Suspense>
      </div>
    );
  }

  let sections: Section[] = [];
  let sectionsError = "";
  try {
    sections = await eduApi.listMySections(session.accessToken, id);
  } catch (e) {
    sectionsError = e instanceof Error ? e.message : "Failed to load sections";
  }

  if (sectionsError && isSubscriptionError(sectionsError)) {
    return (
      <SubscriptionRequired description="Subscribe to Education to view your sections." />
    );
  }

  if (["teacher", "lecturer", "professor"].includes(institute.role)) {
    const teacherTabs: TeacherTab[] = [
      "overview",
      "classes",
      "schedule",
      "attendance",
      "assignments",
      "marks",
      "daily-notes",
      "class-teacher",
      "leave",
      "notices",
      "student-progress",
    ];
    const initialTeacherTab = teacherTabs.includes(query.tab as TeacherTab)
      ? (query.tab as TeacherTab)
      : "overview";
    return (
      <div className="education-app-root">
        <EduNavGate />
        {sectionsError ? (
          <main className="px-6 py-8">
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {sectionsError}
            </p>
          </main>
        ) : (
          <TeacherWorkspace
            instituteId={id}
            instituteName={institute.name}
            sections={sections}
            currentUserId={session.user?.id || ""}
            role={institute.role}
            initialTab={initialTeacherTab}
          />
        )}
      </div>
    );
  }

  if (institute.role === "parent") {
    return (
      <div className="education-app-root">
        <EduNavGate />
        <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading...</div>}>
          <ParentWorkspace instituteId={id} instituteName={institute.name} />
        </Suspense>
      </div>
    );
  }

  if (institute.role !== "student") {
    return (
      <>
        <EduNavGate />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            Your Education workspace is not available for this role yet.
          </p>
        </main>
      </>
    );
  }

  return (
    <div className="education-app-root">
      <EduNavGate />
      {sectionsError ? (
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {sectionsError}
          </p>
        </main>
      ) : (
        <StudentWorkspace
          instituteId={id}
          instituteName={institute.name}
          sections={sections}
          studentId={session.user?.id || ""}
          studentName={session.user?.name || session.user?.email || "Student"}
          initialTab={
            [
              "overview",
              "timetable",
              "assignments",
              "results",
              "attendance",
              "notices",
              "profile",
            ].includes(query.tab || "")
              ? (query.tab as StudentTab)
              : "overview"
          }
        />
      )}
    </div>
  );
}
