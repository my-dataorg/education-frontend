const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export type PendingJoinRequest = {
  id: string;
  instituteId: string;
  instituteName: string | null;
  userId: string;
  userEmail: string | null;
  requestedRole: string;
  message: string;
  status: string;
  createdAt: string;
};

type SessionLike = {
  accessToken?: string;
  user?: { email?: string | null };
};

export async function fetchPendingJoinRequests(
  session: SessionLike
): Promise<PendingJoinRequest[]> {
  if (!session.accessToken) return [];

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
  };
  if (session.user?.email) {
    headers["X-User-Email"] = session.user.email;
  }

  try {
    const res = await fetch(`${API}/v1/users/me/join-requests?status=pending`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
