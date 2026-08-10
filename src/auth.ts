import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

const issuer = process.env.KEYCLOAK_ISSUER!;
const clientId = process.env.KEYCLOAK_CLIENT_ID!;

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
    Keycloak({
      clientId,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "",
      issuer,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at ?? Math.floor(Date.now() / 1000) + 300;
        return token;
      }

      // Refresh ~60s before expiry (Keycloak access tokens last 5 minutes locally)
      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && Date.now() < expiresAt * 1000 - 60_000) {
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
