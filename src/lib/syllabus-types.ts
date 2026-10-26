export type SyllabusNode = {
  id: string;
  title: string;
  weightPercent: number;
  sortOrder: number;
  completedPercent: number;
  effectiveCompletedPercent: number;
  isLeaf: boolean;
  canEditCompletion: boolean;
  children: SyllabusNode[];
};

export type SyllabusTree = {
  subjectId: string;
  subjectName: string;
  subjectTotalCompletedPercent: number;
  nodes: SyllabusNode[];
};

export type SyllabusMode = "admin" | "teacher" | "viewer";
