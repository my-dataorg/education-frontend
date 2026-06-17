const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

async function apiFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export type Institute = {
  id: string;
  name: string;
  joinCode: string;
  role: string;
};

export type InstituteDetail = {
  id: string;
  name: string;
  joinCode: string;
  role: string;
  createdAt: string;
  stats: {
    staffCount: number;
    studentCount: number;
    sectionCount: number;
    branchCount: number;
  };
};

export type InstituteSummary = {
  branchCount: number;
  branches: {
    id: string;
    name: string;
    isPrimary: boolean;
    address: string;
    city: string;
    teacherCount: number;
    studentCount: number;
    teachers: { userId: string; role: string }[];
  }[];
  upcomingEvents: {
    type: string;
    title: string;
    dueDate: string;
    sectionName: string;
    branchName: string | null;
  }[];
};

export type Section = {
  id: string;
  name: string;
  className: string;
  branchId?: string | null;
  branchName?: string | null;
};
export type Member = { userId: string; role: string };
export type Branch = {
  id: string;
  name: string;
  address: string;
  city: string;
  isPrimary: boolean;
  sectionCount: number;
};
export type Assignment = { id: string; title: string; description: string; dueDate: string | null };
export type Note = { id: string; content: string; noteDate: string; teacherId: string };

export const eduApi = {
  listInstitutes: (token: string) => apiFetch("/v1/institutes", token),
  async listInstitutesSafe(token: string): Promise<{ institutes: Institute[]; error: string | null }> {
    try {
      const institutes = await apiFetch("/v1/institutes", token);
      return { institutes, error: null };
    } catch (e) {
      return {
        institutes: [],
        error: e instanceof Error ? e.message : "Failed to load institutes",
      };
    }
  },
  getInstitute: (token: string, id: string) => apiFetch(`/v1/institutes/${id}`, token),
  createInstitute: (token: string, name: string) =>
    apiFetch("/v1/institutes", token, { method: "POST", body: JSON.stringify({ name }) }),
  joinInstitute: (token: string, joinCode: string) =>
    apiFetch("/v1/institutes/join", token, { method: "POST", body: JSON.stringify({ joinCode }) }),
  listSections: (token: string, instituteId: string) =>
    apiFetch(`/v1/institutes/${instituteId}/sections`, token),
  createSection: (token: string, instituteId: string, name: string, className: string, branchId?: string) =>
    apiFetch(`/v1/institutes/${instituteId}/sections`, token, {
      method: "POST",
      body: JSON.stringify({ name, className, branchId: branchId || null }),
    }),
  listMembers: (token: string, instituteId: string, group?: string) =>
    apiFetch(`/v1/institutes/${instituteId}/members${group ? `?group=${group}` : ""}`, token),
  listBranches: (token: string, instituteId: string) =>
    apiFetch(`/v1/institutes/${instituteId}/branches`, token),
  getSummary: (token: string, instituteId: string) =>
    apiFetch(`/v1/institutes/${instituteId}/summary`, token),
  listAssignments: (token: string, sectionId: string) =>
    apiFetch(`/v1/sections/${sectionId}/assignments`, token),
  createAssignment: (token: string, sectionId: string, title: string, description: string) =>
    apiFetch(`/v1/sections/${sectionId}/assignments`, token, {
      method: "POST",
      body: JSON.stringify({ title, description }),
    }),
  listNotes: (token: string, sectionId: string) =>
    apiFetch(`/v1/sections/${sectionId}/notes`, token),
  createNote: (token: string, sectionId: string, content: string) =>
    apiFetch(`/v1/sections/${sectionId}/notes`, token, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  submitAssignment: (token: string, assignmentId: string, content: string) =>
    apiFetch(`/v1/assignments/${assignmentId}/submissions`, token, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
