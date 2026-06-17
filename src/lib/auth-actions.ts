"use server";

import { signIn, signOut } from "@/auth";
import { keycloakLogoutUrl } from "@/lib/keycloak-urls";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const APP_URL = process.env.AUTH_URL || "http://localhost:3010";

async function getServerJwt() {
  const headersList = await headers();
  return getToken({
    req: new Request(APP_URL, { headers: headersList }),
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });
}

export async function signInFresh(redirectTo: string) {
  await signIn("keycloak", {
    redirectTo,
    authorizationParams: { prompt: "login" },
  });
}

export async function federatedSignOut() {
  const token = await getServerJwt();
  const idToken = token?.idToken as string | undefined;
  await signOut({ redirect: false });
  redirect(keycloakLogoutUrl(APP_URL, idToken));
}
