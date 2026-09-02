import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function classSectionLabel(className?: string | null, sectionName?: string | null) {
  const cls = className?.trim();
  const sec = sectionName?.trim();
  if (cls && sec) return `Class : ${cls}  Section : ${sec}`;
  if (cls) return `Class : ${cls}`;
  if (sec) return `Section : ${sec}`;
  return "";
}

export function formatClock(hhmm: string) {
  const [hourPart, minutePart] = hhmm.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return hhmm;
  const suffix = hour >= 12 ? "pm" : "am";
  const twelve = hour % 12 || 12;
  return `${twelve}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function todayClassLabel(item: {
  className: string;
  sectionName: string;
  subjectName: string;
  startTime: string;
  endTime: string;
}) {
  const cls = item.className.trim();
  const sec = item.sectionName.trim();
  const classBit = cls.toLowerCase().startsWith("class") ? cls : `Class ${cls}`;
  const sectionBit = sec.toLowerCase().startsWith("section") ? sec : `Section ${sec}`;
  return `${classBit} ${sectionBit} - ${item.subjectName} - ${formatClock(item.startTime)} to ${formatClock(item.endTime)}`;
}
