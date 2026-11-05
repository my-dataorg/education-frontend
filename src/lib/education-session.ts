import { auth } from "@/auth";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";

const SESSION_UNAUTHORIZED =
  "Your Education session expired. Sign out and open Lab again from the dashboard (use the same site URL as AUTH_URL on the server).";

export { SESSION_UNAUTHORIZED };

/** Platform access token for BFF → education-backend calls. */
export async function educationAccessToken(): Promise<string | undefined> {
  const session = await auth();
  if (session?.accessToken) return session.accessToken;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return undefined;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
  if (!cookieHeader) return undefined;

  const authUrl = process.env.AUTH_URL || "";
  const token = await getToken({
    req: { headers: { cookie: cookieHeader } },
    secret,
    secureCookie: authUrl.startsWith("https://"),
  });
  const accessToken = token?.accessToken;
  return typeof accessToken === "string" ? accessToken : undefined;
}
