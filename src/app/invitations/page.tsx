import { auth } from "@/auth";
import { EduNav } from "@/components/edu-nav";
import { InvitationsList } from "@/components/invitations-list";
import { fetchPendingInvitations } from "@/lib/fetch-invitations";
import { redirect } from "next/navigation";

export default async function InvitationsPage() {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const invites = await fetchPendingInvitations(session);

  return (
    <>
      <EduNav pendingInviteCount={invites.length} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Institute invitations</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as {session.user?.email}. Accept to join an institute as a student or staff
          member.
        </p>
        {invites.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No pending invitations. Ask your institute admin to invite this email address.
          </p>
        ) : (
          <div className="mt-8">
            <InvitationsList invites={invites} variant="prominent" />
          </div>
        )}
      </main>
    </>
  );
}
