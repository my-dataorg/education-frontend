import { auth } from "@/auth";
import { federatedSignOut, signInFresh } from "@/lib/auth-actions";
import { keycloakRegistrationUrl } from "@/lib/keycloak-urls";
import { fetchPendingInvitations } from "@/lib/fetch-invitations";
import { InvitationsList } from "@/components/invitations-list";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default async function LoginPage() {
  const session = await auth();
  const appUrl = process.env.AUTH_URL || "http://localhost:3010";
  const registerUrl = keycloakRegistrationUrl(appUrl);

  if (session?.user && session.accessToken) {
    const pendingInvites = await fetchPendingInvitations(session);

    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 shadow-sm">
          <h1 className="text-center text-xl font-semibold">Already signed in</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {session.user.name || session.user.email}
          </p>

          {pendingInvites.length > 0 ? (
            <div className="mt-6">
              <InvitationsList invites={pendingInvites} variant="prominent" />
            </div>
          ) : (
            <Link
              href="/institutes"
              className="mt-6 block w-full rounded-xl bg-primary py-3 text-center text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Continue to Education
            </Link>
          )}

          <form
            className="mt-3"
            action={async () => {
              "use server";
              await federatedSignOut();
            }}
          >
            <button
              type="submit"
              className="w-full rounded-xl border border-border py-3 text-sm font-medium hover:bg-muted"
            >
              Sign in as a different user
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold">Education</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in or create a MyData account. If an admin invited you as staff or student, sign in
          with that email to accept the invitation.
        </p>
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signInFresh("/institutes");
          }}
        >
          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Sign in
          </button>
        </form>
        <Link
          href={registerUrl}
          className="mt-3 block w-full rounded-xl border border-border py-3 text-sm font-medium hover:bg-muted"
        >
          Create account
        </Link>
        <Link href="http://localhost:3000" className="mt-6 block text-xs text-muted-foreground hover:foreground">
          ← Back to Platform
        </Link>
      </div>
    </div>
  );
}
