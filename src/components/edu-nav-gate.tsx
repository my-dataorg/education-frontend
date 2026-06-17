import { cookies, headers } from "next/headers";
import { EduNav } from "@/components/edu-nav";

export async function EduNavGate({ pendingInviteCount = 0 }: { pendingInviteCount?: number }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const embedded =
    headerStore.get("x-edu-embed") === "1" || cookieStore.get("edu-embed")?.value === "1";
  if (embedded) {
    return null;
  }
  return <EduNav pendingInviteCount={pendingInviteCount} />;
}
