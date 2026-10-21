"use server";

import { signOut } from "@/auth";
import { redirect } from "next/navigation";

const PLATFORM_URL = process.env.PLATFORM_URL || "http://localhost:3000";

export async function federatedSignOut() {
  await signOut({ redirect: false });
  redirect(`${PLATFORM_URL}/login`);
}
