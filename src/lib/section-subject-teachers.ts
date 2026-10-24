/** Section subjects API may return teacher ids as strings or { userId }. */
export function teacherUserId(teacher: string | { userId?: string }): string {
  return typeof teacher === "string" ? teacher : teacher.userId ?? "";
}
