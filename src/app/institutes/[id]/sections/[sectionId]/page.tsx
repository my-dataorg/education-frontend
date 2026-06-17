import { auth } from "@/auth";
import { eduApi, type Assignment, type Note } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EduNav } from "@/components/edu-nav";
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

  let assignments: Assignment[] = [];
  let notes: Note[] = [];
  let loadError = "";
  try {
    [assignments, notes] = await Promise.all([
      eduApi.listAssignments(session.accessToken, sectionId),
      eduApi.listNotes(session.accessToken, sectionId),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load section";
  }

  if (loadError && isSubscriptionError(loadError)) {
    return <SubscriptionRequired description="Subscribe to Education to access this section." />;
  }

  if (loadError) {
    return (
      <>
        <EduNav />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <EduNav />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link href={`/institutes/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {institute.name}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Section</h1>
        <SectionWorkspace
          instituteId={id}
          sectionId={sectionId}
          role={institute.role}
          assignments={assignments}
          notes={notes}
        />
      </main>
    </>
  );
}
