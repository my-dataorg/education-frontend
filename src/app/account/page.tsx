import { auth } from "@/auth";
import { EduNavGate } from "@/components/edu-nav-gate";
import Link from "next/link";
import { redirect } from "next/navigation";

const PLATFORM_ORIGIN = process.env.NEXT_PUBLIC_PLATFORM_URL || "http://localhost:3000";

export default async function EducationAccountPage() {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const name = session.user?.name || "Your account";
  const email = session.user?.email || "";

  return (
    <>
      <EduNavGate />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Education notifications and preferences. Profile and security are managed on MyData.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Notifications</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your cross-institute notification inbox will appear here. Until it is wired, use institute notices in each
              workspace.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">No notifications yet.</p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Profile</h2>
            <p className="mt-2 text-sm font-medium">{name}</p>
            {email && <p className="text-sm text-muted-foreground">{email}</p>}
            <Link
              href={`${PLATFORM_ORIGIN}/dashboard`}
              className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Open MyData profile &amp; security
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              Change photo, phone, email, password, and sessions on the platform dashboard.
            </p>
          </section>
        </div>

        <Link href="/institutes?stay=1" className="mt-8 inline-block text-sm text-primary hover:underline">
          ← Switch institute
        </Link>
      </main>
    </>
  );
}
