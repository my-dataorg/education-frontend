import { auth, isPlatformAccessTokenValid, signOut } from "@/auth";
import { PlatformTopLoginRedirect } from "@/components/platform-top-login-redirect";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const PLATFORM_URL = process.env.PLATFORM_URL || "http://localhost:3000";
const PLATFORM_CALLBACK = `${PLATFORM_URL}/dashboard?app=education`;
const PLATFORM_LOGIN_URL = `${PLATFORM_URL}/login?callbackUrl=${encodeURIComponent(PLATFORM_CALLBACK)}`;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; embed?: string }>;
}) {
  const { reason, embed: embedParam } = await searchParams;
  const embedded = embedParam === "1";
  const sessionExpired = reason === "session";
  const session = await auth();

  let tokenValid = false;
  if (session?.accessToken) {
    tokenValid = await isPlatformAccessTokenValid(session.accessToken);
  }

  if (session && (!tokenValid || sessionExpired)) {
    await signOut({ redirect: false });
    tokenValid = false;
  }

  if (!tokenValid && (embedded || sessionExpired)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <PlatformTopLoginRedirect loginUrl={PLATFORM_LOGIN_URL} />
      </div>
    );
  }

  if (tokenValid && session?.user) {
    redirect(embedded ? "/institutes?embed=1" : "/institutes");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold">Education</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in on the MyData platform, then open Education from your dashboard. Use the same email
          if an admin invited you as staff or student.
        </p>
        {sessionExpired && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Your previous sign-in expired. Please sign in on the platform again.
          </p>
        )}
        <Link
          href={PLATFORM_LOGIN_URL}
          target="_top"
          className="mt-8 block w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Sign in on Platform
        </Link>
        <Link
          href={`${PLATFORM_URL}/signup`}
          target="_top"
          className="mt-3 block w-full rounded-xl border border-border py-3 text-sm font-medium hover:bg-muted"
        >
          Create account
        </Link>
        <Link href={PLATFORM_URL} target="_top" className="mt-6 block text-xs text-muted-foreground hover:text-foreground">
          ← Back to Platform
        </Link>
      </div>
    </div>
  );
}
