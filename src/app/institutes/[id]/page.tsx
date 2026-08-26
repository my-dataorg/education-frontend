import { auth } from "@/auth";
import { eduApi, type InstituteSummary, type PendingWorkItem, type Section } from "@/lib/api";
import { MANAGE_ROLES } from "@/lib/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EduNavGate } from "@/components/edu-nav-gate";
import { InstituteDashboard } from "@/components/institute-dashboard";
import { PendingWorkPanel } from "@/components/pending-work-panel";
import { isSubscriptionError, SubscriptionRequired } from "@/components/subscription-required";
import { classSectionLabel } from "@/lib/utils";
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
  pendingItems,
  pendingError,
}: {
  institute: { id: string; name: string; role: string };
  sections: Section[];
  instituteId: string;
  pendingItems: PendingWorkItem[];
  pendingError: string;
}) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold">{institute.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your role: {institute.role}</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <PendingWorkPanel items={pendingItems} error={pendingError} />

        <section>
          <h2 className="font-medium">My sections</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sections you are assigned to at this institute
          </p>
          {sections.length === 0 ? (
            <p className="mt-4 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              You are not enrolled in any sections yet. Ask your admin to assign you.
            </p>
          ) : (
            <div className="mt-4 grid gap-4">
              {sections.map((s) => (
                <Link
                  key={s.id}
                  href={`/institutes/${instituteId}/sections/${s.id}`}
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/30"
                >
                  <h3 className="font-medium">{classSectionLabel(s.className, s.name) || s.name}</h3>
                  {s.subjectNames && s.subjectNames.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">{s.subjectNames.join(", ")}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
