import { auth } from "@/auth";
import { eduApi, type Institute } from "@/lib/api";
import { fetchPendingJoinRequests } from "@/lib/fetch-join-requests";
import { fetchPendingInvitations } from "@/lib/fetch-invitations";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EduNavGate } from "@/components/edu-nav-gate";
import { PageHeader } from "@/components/shell/page-header";
import { InvitationsList } from "@/components/invitations-list";
import { EducationDashboard } from "@/components/education-dashboard";
import { isSubscriptionError } from "@/components/subscription-required";
import { isInvalidSessionError } from "@/lib/auth-errors";
import { reauthAfterInvalidSession } from "@/lib/auth-actions";
import { cookies } from "next/headers";

export default async function InstitutesPage({
  searchParams,
}: {
  searchParams: Promise<{ stay?: string; embed?: string }>;
}) {
  const query = await searchParams;
  const cookieStore = await cookies();
  const embedded =
    query.embed === "1" || cookieStore.get("edu-embed")?.value === "1";
  const session = await auth();
  if (!session?.accessToken) {
    const login = embedded ? "/login?embed=1" : "/login?reason=session";
    redirect(login);
  }

  const pendingInvites = await fetchPendingInvitations(session);
  const pendingJoinRequests = await fetchPendingJoinRequests(session);

  let institutes: Institute[] = [];
  let error = "";
  const result = await eduApi.listInstitutesSafe(session.accessToken);
  institutes = result.institutes;
  error = result.error || "";

  if (error && isInvalidSessionError(error)) {
    await reauthAfterInvalidSession(embedded);
  }

  const showInviteFirst = pendingInvites.length > 0 && institutes.length === 0;

  return (
    <>
      <EduNavGate pendingInviteCount={pendingInvites.length} />
      <main className="mx-auto max-w-6xl bg-background px-4 py-8 sm:px-6">
        <PageHeader
          title="Dashboard"
          subtitle="Your institutes are on the left. Learning hub, Lab, and join tools are on the right."
        />

        {pendingJoinRequests.length > 0 && (
          <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
            <h2 className="text-sm font-semibold text-amber-900">Join requests pending</h2>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {pendingJoinRequests.map((req) => (
                <li key={req.id}>
                  <strong>{req.instituteName}</strong> — awaiting admin approval (
                  {req.requestedRole})
                </li>
              ))}
            </ul>
          </section>
        )}

        {pendingInvites.length > 0 && (
          <section className="mb-10">
            <InvitationsList invites={pendingInvites} variant="prominent" />
          </section>
        )}

        {error && !showInviteFirst && (
          <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
            {isSubscriptionError(error) && (
              <>
                {" "}
                <Link
                  href={`${process.env.PLATFORM_URL || "http://localhost:3000"}/marketplace`}
                  className="text-primary hover:underline"
                >
                  Subscribe in the marketplace
                </Link>
                .
              </>
            )}
          </p>
        )}

        {!showInviteFirst && <EducationDashboard institutes={institutes} />}

        {showInviteFirst && (
          <p className="text-sm text-muted-foreground">
            Accept an invitation above to join an institute, or use the tools on the dashboard after
            you decline.
          </p>
        )}

        <Link href="/invitations" className="mt-8 inline-block text-sm text-primary hover:underline">
          View all invitations
        </Link>
      </main>
    </>
  );
}
