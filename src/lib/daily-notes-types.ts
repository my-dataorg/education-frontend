export type DailyNoteAttachment = {
  id: string;
  name: string;
  contentType: string;
  dataUrl: string;
};

export type DailyNoteSheet = {
  id: string | null;
  subjectId: string;
  content: string;
  noteDate: string;
  teacherId?: string | null;
  drawingJson: string;
  attachments: DailyNoteAttachment[];
  editable: boolean;
};

export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
