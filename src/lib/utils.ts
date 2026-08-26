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
