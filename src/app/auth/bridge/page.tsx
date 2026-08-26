import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

function safeNext(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/institutes";
  return path;
}

export default async function AuthBridge({
  searchParams,
}: {
  searchParams: Promise<{ pt?: string; next?: string; embed?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const dest = params.embed === "1" ? `${next}${next.includes("?") ? "&" : "?"}embed=1` : next;

  const session = await auth();
  if (session?.accessToken && (!params.pt || session.accessToken === params.pt)) {
    redirect(dest);
  }

  if (!params.pt) {
    redirect(`/login?callbackUrl=${encodeURIComponent(dest)}`);
  }

  await signIn("credentials", {
    accessToken: params.pt,
    redirectTo: dest,
  });
}
