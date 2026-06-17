import { auth } from "@/auth";
import { eduApi, type Institute } from "@/lib/api";
import { fetchPendingJoinRequests } from "@/lib/fetch-join-requests";
import { fetchPendingInvitations } from "@/lib/fetch-invitations";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EduNavGate } from "@/components/edu-nav-gate";
import { InvitationsList } from "@/components/invitations-list";
import { isSubscriptionError } from "@/components/subscription-required";

export default async function InstitutesPage() {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const pendingInvites = await fetchPendingInvitations(session);
  const pendingJoinRequests = await fetchPendingJoinRequests(session);

  let institutes: Institute[] = [];
  let error = "";
  const result = await eduApi.listInstitutesSafe(session.accessToken);
  institutes = result.institutes;
  error = result.error || "";

  if (institutes.length === 1 && pendingInvites.length === 0 && pendingJoinRequests.length === 0) {
    redirect(`/institutes/${institutes[0].id}`);
  }

  const showInviteFirst = pendingInvites.length > 0 && institutes.length === 0;

  return (
    <>
      <EduNavGate pendingInviteCount={pendingInvites.length} />
      <main className="mx-auto max-w-5xl px-6 py-8">
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
                <Link href="http://localhost:3000/marketplace" className="text-primary hover:underline">
                  Subscribe in the marketplace
                </Link>
                .
              </>
            )}
          </p>
        )}

        {institutes.length === 0 && !showInviteFirst ? (
          <EmptyState hasPendingInvites={pendingInvites.length > 0} />
        ) : institutes.length > 0 ? (
          <MultipleInstitutes institutes={institutes} />
        ) : null}
      </main>
    </>
  );
}

function EmptyState({ hasPendingInvites }: { hasPendingInvites: boolean }) {
  if (hasPendingInvites) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Accept an invitation above to join an institute and open your dashboard.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-lg text-center">
      <h1 className="text-2xl font-semibold">Welcome to Education</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Create an institute, join with a code, or wait for an admin to invite your email.
        Use <strong>Manage institutes</strong> in the nav to create or join.
      </p>
      <Link
        href="/institutes/join"
        className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Request to join with code
      </Link>
      <Link
        href="/invitations"
        className="mt-4 block text-sm text-primary hover:underline"
      >
        View invitations
      </Link>
    </div>
  );
}

function MultipleInstitutes({ institutes }: { institutes: Institute[] }) {
  return (
    <>
      <h1 className="text-2xl font-semibold">Select an institute</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You belong to multiple institutes. Choose one to continue.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {institutes.map((inst) => (
          <Link
            key={inst.id}
            href={`/institutes/${inst.id}`}
            className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
          >
            <h3 className="font-semibold">{inst.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Role: {inst.role}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
