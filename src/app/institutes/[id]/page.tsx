import { auth } from "@/auth";
import { eduApi, type InstituteSummary, type Section } from "@/lib/api";
import { MANAGE_ROLES, STAFF_VIEW_ROLES } from "@/lib/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EduNav } from "@/components/edu-nav";
import { InstituteDashboard } from "@/components/institute-dashboard";
import { isSubscriptionError, SubscriptionRequired } from "@/components/subscription-required";
import { Suspense } from "react";

export default async function InstitutePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
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
        <EduNav />
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

  const hasMultiple = institutes.length > 1;
  const canManage = MANAGE_ROLES.has(institute.role);
  const canViewDirectory = STAFF_VIEW_ROLES.has(institute.role);

  if (canViewDirectory) {
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
          <EduNav />
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
        <EduNav />
        <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading...</div>}>
          <InstituteDashboard
            instituteId={id}
            detail={detail}
            summary={summary}
            canManage={canManage}
            hasMultiple={hasMultiple}
            currentUserId={session.user?.id || ""}
          />
        </Suspense>
      </>
    );
  }

  let sections: Section[] = [];
  let sectionsError = "";
  try {
    sections = await eduApi.listSections(session.accessToken, id);
  } catch (e) {
    sectionsError = e instanceof Error ? e.message : "Failed to load sections";
  }

  if (sectionsError && isSubscriptionError(sectionsError)) {
    return (
      <SubscriptionRequired description="Subscribe to Education to view your sections." />
    );
  }

  return (
    <>
      <EduNav />
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
          hasMultiple={hasMultiple}
        />
      )}
    </>
  );
}

function MemberInstituteView({
  institute,
  sections,
  instituteId,
  hasMultiple,
}: {
  institute: { id: string; name: string; role: string };
  sections: Section[];
  instituteId: string;
  hasMultiple: boolean;
}) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      {hasMultiple && (
        <Link href="/institutes" className="text-sm text-muted-foreground hover:text-foreground">
          ← All institutes
        </Link>
      )}
      <h1 className={`text-2xl font-semibold ${hasMultiple ? "mt-4" : ""}`}>{institute.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your role: {institute.role}</p>

      <h2 className="mt-10 font-medium">Sections</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link
            key={s.id}
            href={`/institutes/${instituteId}/sections/${s.id}`}
            className="rounded-xl border border-border bg-card p-5 hover:border-primary/30"
          >
            <h3 className="font-medium">{s.name}</h3>
            {s.className && <p className="text-sm text-muted-foreground">{s.className}</p>}
          </Link>
        ))}
      </div>
      {sections.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">No sections yet. Ask your institute admin to add one.</p>
      )}
    </main>
  );
}
