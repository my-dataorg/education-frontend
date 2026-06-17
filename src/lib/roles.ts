export const MANAGE_ROLES = new Set(["owner", "admin"]);
export const STAFF_VIEW_ROLES = new Set([
  "owner",
  "admin",
  "principal",
  "teacher",
  "lecturer",
  "professor",
]);

export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  principal: "Principal",
  teacher: "Teacher",
  lecturer: "Lecturer",
  professor: "Professor",
  student: "Student",
};

export const STAFF_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "principal", label: "Principal" },
  { value: "teacher", label: "Teacher" },
  { value: "lecturer", label: "Lecturer" },
  { value: "professor", label: "Professor" },
];

export function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}
