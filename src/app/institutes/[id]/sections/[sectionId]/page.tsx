import { auth } from "@/auth";
import { eduApi, type Assignment, type Note } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EduNavGate } from "@/components/edu-nav-gate";
import { SectionWorkspace } from "@/components/section-workspace";
import { isSubscriptionError, SubscriptionRequired } from "@/components/subscription-required";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  const { id, sectionId } = await params;
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const { institutes, error: listError } = await eduApi.listInstitutesSafe(session.accessToken);

  if (listError && isSubscriptionError(listError)) {
    return <SubscriptionRequired description="Subscribe to Education to access section workspaces." />;
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

  let overview;
  let assignments: Assignment[] = [];
  let notes: Note[] = [];
  let loadError = "";
  try {
    [overview, assignments, notes] = await Promise.all([
      eduApi.getSectionOverview(session.accessToken, sectionId),
      eduApi.listAssignments(session.accessToken, sectionId),
      eduApi.listNotes(session.accessToken, sectionId),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load section";
  }

  if (loadError && isSubscriptionError(loadError)) {
    return <SubscriptionRequired description="Subscribe to Education to access this section." />;
  }

  if (loadError || !overview) {
    return (
      <>
        <EduNavGate />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError || "Failed to load section"}
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <EduNavGate />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link href={`/institutes/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {institute.name}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">{overview.sectionName}</h1>
        {overview.className && (
          <p className="mt-1 text-sm text-muted-foreground">{overview.className}</p>
        )}
        <SectionWorkspace
          instituteId={id}
          sectionId={sectionId}
          role={institute.role}
          overview={overview}
          assignments={assignments}
          notes={notes}
        />
      </main>
    </>
  );
}
