import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { safeBridgePath } from "@/lib/auth-bridge";

const PLATFORM_API = (
  process.env.PLATFORM_API_URL || "http://127.0.0.1:8002"
).replace("://localhost", "://127.0.0.1");

async function userFromAccessToken(accessToken: string) {
  const res = await fetch(`${PLATFORM_API}/v1/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const user = await res.json();
  if (!user?.id) return null;
  return {
    id: user.id as string,
    email: user.email as string,
    name: (user.name as string) || "User",
    accessToken,
  };
}

async function exchangeHandoff(code: string, returnPath: string) {
  const appUrl = process.env.AUTH_URL || "http://localhost:3010";
  let targetOrigin: string;
  try {
    targetOrigin = new URL(appUrl).origin;
  } catch {
    return null;
  }

  const res = await fetch(`${PLATFORM_API}/v1/products/handoff/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, targetOrigin, returnPath }),
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.accessToken) return null;
  return userFromAccessToken(data.accessToken as string);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: "platform-handoff",
      name: "Platform handoff",
      credentials: {
        code: { label: "Handoff code", type: "text" },
        returnPath: { label: "Return path", type: "text" },
      },
      async authorize(credentials) {
        const code = String(credentials?.code || "").trim();
        const returnPath = safeBridgePath(String(credentials?.returnPath || ""));
        if (!code) return null;
        return exchangeHandoff(code, returnPath);
      },
    }),
    Credentials({
      id: "platform-token",
      name: "Platform token",
      credentials: {
        accessToken: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const accessToken = String(credentials?.accessToken || "");
        if (!accessToken) return null;
        return userFromAccessToken(accessToken);
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user && (user as { accessToken?: string }).accessToken) {
        token.accessToken = (user as { accessToken: string }).accessToken;
        token.userId = user.id;
        token.expiresAt = Math.floor(Date.now() / 1000) + 3600;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      if (session.user) {
        session.user.id = (token.userId ?? token.sub) as string;
      }
      return session;
    },
  },
});
