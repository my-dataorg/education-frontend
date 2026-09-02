import { auth } from "@/auth";
import { eduApi, type InstituteSummary, type PendingWorkItem, type Section, type TodayClass } from "@/lib/api";
import { MANAGE_ROLES } from "@/lib/roles";
import { redirect } from "next/navigation";
import { EduNavGate } from "@/components/edu-nav-gate";
import { InstituteDashboard } from "@/components/institute-dashboard";
import { MySectionsDropdown } from "@/components/my-sections-dropdown";
import { PendingWorkPanel } from "@/components/pending-work-panel";
import { TodayClassesPanel } from "@/components/today-classes-panel";
import { isSubscriptionError, SubscriptionRequired } from "@/components/subscription-required";
import { Suspense } from "react";

export default async function InstitutePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id } = await params;
  await searchParams;
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
      <>
        <EduNavGate />
        <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading...</div>}>
          <InstituteDashboard
            instituteId={id}
            institutes={institutes}
            detail={detail}
            summary={summary}
            canManage={canManage}
            currentUserId={session.user?.id || ""}
          />
        </Suspense>
      </>
    );
  }

  let sections: Section[] = [];
  let sectionsError = "";
  let pendingItems: PendingWorkItem[] = [];
  let pendingError = "";
  let todayItems: TodayClass[] = [];
  let todayError = "";
  try {
    sections = await eduApi.listMySections(session.accessToken, id);
  } catch (e) {
    sectionsError = e instanceof Error ? e.message : "Failed to load sections";
  }
  if (!sectionsError) {
    try {
      pendingItems = (await eduApi.getPendingWork(session.accessToken, id)).items;
    } catch {
      pendingError = "Could not load to-do.";
    }
    try {
      todayItems = (await eduApi.getTodayClasses(session.accessToken, id)).items;
    } catch {
      todayError = "Could not load today's classes.";
    }
  }

  if (sectionsError && isSubscriptionError(sectionsError)) {
    return (
      <SubscriptionRequired description="Subscribe to Education to view your sections." />
    );
  }

  return (
    <>
      <EduNavGate />
      {sectionsError ? (
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {sectionsError}
          </p>
        </main>
      ) : (
        <MemberInstituteView
          institute={institute}
          sections={sections}
          instituteId={id}
          todayItems={todayItems}
          todayError={todayError}
          pendingItems={pendingItems}
          pendingError={pendingError}
        />
      )}
    </>
  );
}

function MemberInstituteView({
  institute,
  sections,
  instituteId,
  todayItems,
  todayError,
  pendingItems,
  pendingError,
}: {
  institute: { id: string; name: string; role: string };
  sections: Section[];
  instituteId: string;
  todayItems: TodayClass[];
  todayError: string;
  pendingItems: PendingWorkItem[];
  pendingError: string;
}) {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b border-border px-6 py-6">
        <h1 className="text-2xl font-semibold">{institute.name}</h1>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Your role: {institute.role}</p>
          <MySectionsDropdown instituteId={instituteId} sections={sections} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-border">
        <div className="min-w-0 px-6 py-8">
          <TodayClassesPanel items={todayItems} error={todayError} />
        </div>

        <div className="min-w-0 px-6 py-8">
          <PendingWorkPanel items={pendingItems} error={pendingError} />
        </div>
      </div>
    </main>
  );
}
