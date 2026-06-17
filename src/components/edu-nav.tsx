import Link from "next/link";
import { auth } from "@/auth";
import { federatedSignOut } from "@/lib/auth-actions";
import { ManageInstitutesDropdown } from "@/components/manage-institutes-dropdown";
import { PendingInvitationsBanner } from "@/components/pending-invitations-banner";

export async function EduNav({ pendingInviteCount = 0 }: { pendingInviteCount?: number }) {
  const session = await auth();
  return (
    <>
      <PendingInvitationsBanner />
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/institutes" className="font-semibold">
              Education
            </Link>
            <Link href="/institutes" className="text-sm text-muted-foreground hover:text-foreground">
              My Institutes
            </Link>
            <Link
              href="/invitations"
              className="relative text-sm text-muted-foreground hover:text-foreground"
            >
              Invitations
              {pendingInviteCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                  {pendingInviteCount}
                </span>
              )}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ManageInstitutesDropdown />
            <span className="hidden text-sm text-muted-foreground sm:inline">{session?.user?.name}</span>
            <Link href="http://localhost:3000/dashboard" className="text-sm text-primary hover:underline">
              Platform
            </Link>
            <form
              action={async () => {
                "use server";
                await federatedSignOut();
              }}
            >
              <button type="submit" className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-muted">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
    </>
  );
}
