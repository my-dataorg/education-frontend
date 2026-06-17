import type { PendingInvitation } from "@/components/pending-invitations-banner-client";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

type SessionLike = {
  accessToken?: string;
  user?: { email?: string | null };
};

export async function fetchPendingInvitations(
  session: SessionLike
): Promise<PendingInvitation[]> {
  if (!session.accessToken) return [];

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
  };
  if (session.user?.email) {
    headers["X-User-Email"] = session.user.email;
  }

  try {
    const res = await fetch(`${API}/v1/users/me/invitations`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
