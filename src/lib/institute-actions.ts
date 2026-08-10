"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

async function bearer() {
  const session = await auth();
  if (!session?.accessToken) {
    return { error: "Please sign in again to continue.", status: 401 as const, token: null };
  }
  if (session.error === "RefreshTokenError") {
    return { error: "Session expired. Please sign in again.", status: 401 as const, token: null };
  }
  return { error: null, status: 200 as const, token: session.accessToken };
}

export async function createInstituteAction(name: string) {
  const authz = await bearer();
  if (!authz.token) return { ok: false as const, error: authz.error! };

  const res = await fetch(`${API}/v1/institutes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authz.token}`,
    },
    body: JSON.stringify({ name: name.trim() }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data.detail === "string" ? data.detail : `Could not create institute (${res.status}).`;
    return { ok: false as const, error: detail };
  }

  revalidatePath("/institutes");
  return { ok: true as const, institute: data as { id: string; name: string; joinCode: string; role: string } };
}

export async function deleteInstituteAction(id: string) {
  const authz = await bearer();
  if (!authz.token) return { ok: false as const, error: authz.error! };

  const res = await fetch(`${API}/v1/institutes/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${authz.token}` },
  });

  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    const detail = typeof data.detail === "string" ? data.detail : `Could not delete institute (${res.status}).`;
    return { ok: false as const, error: detail };
  }

  revalidatePath("/institutes");
  return { ok: true as const };
}

export async function listOwnedInstitutesAction() {
  const authz = await bearer();
  if (!authz.token) return { ok: false as const, error: authz.error!, institutes: [] };

  const res = await fetch(`${API}/v1/institutes`, {
    headers: { Authorization: `Bearer ${authz.token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return { ok: false as const, error: "Could not load institutes.", institutes: [] };
  }
  const list = (await res.json()) as { id: string; name: string; role: string; joinCode: string }[];
  return { ok: true as const, error: null, institutes: list.filter((i) => i.role === "owner") };
}
