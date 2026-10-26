import type { ClassBoardAttachment } from "@/lib/class-board-types";

export type ClassBoardLocalDraft = {
  content: string;
  drawingJson: string;
  attachments: ClassBoardAttachment[];
  savedAt: number;
};

export function classBoardDraftKey(sectionId: string, subjectId: string, noteDate: string): string {
  return `class-board-draft:${sectionId}:${subjectId}:${noteDate}`;
}

export function readLocalDraft(key: string): ClassBoardLocalDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as ClassBoardLocalDraft;
    if (!data || typeof data.savedAt !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export function writeLocalDraft(key: string, draft: Omit<ClassBoardLocalDraft, "savedAt">): void {
  if (typeof window === "undefined") return;
  const payload: ClassBoardLocalDraft = { ...draft, savedAt: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Quota exceeded — teacher can still use server draft backup.
  }
}

export function clearLocalDraft(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

export function mergeSheetWithLocalDraft<
  T extends { content: string; drawingJson: string; attachments: ClassBoardAttachment[] },
>(server: T, local: ClassBoardLocalDraft | null): T {
  if (!local) return server;
  const serverStamp =
    (server.content?.length ?? 0) +
    (server.drawingJson?.length ?? 0) +
    (server.attachments?.length ?? 0);
  const localStamp =
    local.content.length + local.drawingJson.length + local.attachments.length;
  if (local.savedAt > 0 && (localStamp > serverStamp || serverStamp === 0)) {
    return {
      ...server,
      content: local.content,
      drawingJson: local.drawingJson,
      attachments: local.attachments,
    };
  }
  return server;
}
