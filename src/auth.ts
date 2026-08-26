import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Keycloak from "next-auth/providers/keycloak";

const issuer = process.env.KEYCLOAK_ISSUER!;
const clientId = process.env.KEYCLOAK_CLIENT_ID!;
const PLATFORM_API = (
  process.env.PLATFORM_API_URL || "http://127.0.0.1:8002"
).replace("://localhost", "://127.0.0.1");

async function refreshAccessToken(token: {
  refreshToken?: string;
  accessToken?: string;
  idToken?: string;
  expiresAt?: number;
  error?: string;
  [key: string]: unknown;
}) {
  if (!token.refreshToken) {
    return { ...token, error: "RefreshTokenError" };
  }

  try {
    const res = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || "Token refresh failed");
    }

    return {
      ...token,
      accessToken: data.access_token as string,
      idToken: (data.id_token as string) || token.idToken,
      refreshToken: (data.refresh_token as string) || token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in as number),
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: "credentials",
      credentials: {
        accessToken: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const accessToken = String(credentials?.accessToken || "");
        if (!accessToken) return null;
        const res = await fetch(`${PLATFORM_API}/v1/users/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
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
      },
    }),
    Keycloak({
      clientId,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "",
      issuer,
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (user?.accessToken) {
        token.accessToken = user.accessToken;
        token.expiresAt = Math.floor(Date.now() / 1000) + 3600;
        return token;
      }
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at ?? Math.floor(Date.now() / 1000) + 300;
        return token;
      }

      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && Date.now() < expiresAt * 1000 - 60_000) {
        return token;
      }
      if (!token.refreshToken) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      if (token.error) {
        session.error = token.error as string;
      }
      if (session.user) session.user.id = token.sub as string;
      return session;
    },
  },
});
