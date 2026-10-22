"use server";

import { signOut } from "@/auth";
import { redirect } from "next/navigation";

const PLATFORM_URL = process.env.PLATFORM_URL || "http://localhost:3000";

/** Clear a stale Education session without the NextAuth sign-out confirmation page. */
export async function reauthAfterInvalidSession(embed: boolean) {
  const params = new URLSearchParams({ reason: "session" });
  if (embed) params.set("embed", "1");
  await signOut({ redirectTo: `/login?${params.toString()}` });
}

export async function federatedSignOut() {
  await signOut({ redirect: false });
  redirect(`${PLATFORM_URL}/login`);
}
