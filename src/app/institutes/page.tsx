import { auth } from "@/auth";
import { eduApi, type Institute } from "@/lib/api";
import { fetchPendingJoinRequests } from "@/lib/fetch-join-requests";
import { fetchPendingInvitations } from "@/lib/fetch-invitations";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, KeyRound, Plus } from "lucide-react";
import { EduNavGate } from "@/components/edu-nav-gate";
import { InstituteActionsBar } from "@/components/institute-actions-bar";
import { InvitationsList } from "@/components/invitations-list";
import { ModuleCard } from "@/components/shell/module-card";
import { isSubscriptionError } from "@/components/subscription-required";
import { CreateInstituteModule } from "@/components/create-institute-module";

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
      <main className="mx-auto max-w-6xl bg-background px-4 py-8 sm:px-6">
        <InstituteActionsBar
          title={institutes.length === 0 ? "Dashboard" : "Your institutes"}
          subtitle={
            institutes.length === 0
              ? "Overview of Education — create an institute or join with a code."
              : "Choose an institute, or manage create / join / delete."
          }
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
                <Link href="http://localhost:3000/marketplace" className="text-primary hover:underline">
                  Subscribe in the marketplace
                </Link>
                .
              </>
            )}
          </p>
        )}

        {institutes.length === 0 && !showInviteFirst ? (
          <EmptyState />
        ) : institutes.length > 0 ? (
          <MultipleInstitutes institutes={institutes} />
        ) : null}
      </main>
    </>
  );
}

function EmptyState() {
  return (
    <div>
      <h2 className="mb-4 font-serif text-xl font-semibold">Quick access</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <CreateInstituteModule />
        <ModuleCard
          href="/institutes/join"
          icon={<KeyRound className="h-6 w-6" />}
          title="Join with code"
          description="Enter a join code from your institute admin to request access."
        />
      </div>
      <Link href="/invitations" className="mt-6 inline-block text-sm text-primary hover:underline">
        View invitations
      </Link>
    </div>
  );
}

function MultipleInstitutes({ institutes }: { institutes: Institute[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {institutes.map((inst) => (
        <ModuleCard
          key={inst.id}
          href={`/institutes/${inst.id}`}
          icon={<Building2 className="h-6 w-6" />}
          title={inst.name}
          description={`Your role: ${inst.role}`}
        />
      ))}
      <ModuleCard
        href="/institutes/join"
        icon={<Plus className="h-6 w-6" />}
        title="Join another"
        description="Request to join an institute with a code."
      />
    </div>
  );
}
