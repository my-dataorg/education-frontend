"use client";

import { useEffect } from "react";

export function EducationContextReporter({
  instituteName,
  subtitle,
  role,
}: {
  instituteName: string;
  subtitle?: string;
  role?: string;
}) {
  useEffect(() => {
    window.parent.postMessage(
      { type: "app-context", name: instituteName, subtitle, role },
      "*"
    );
  }, [instituteName, role, subtitle]);

  return null;
}
