"use client";

import { useEffect } from "react";

export function EducationContextReporter({
  instituteName,
  subtitle,
  role,
  showManageInstitutes = false,
}: {
  instituteName: string;
  subtitle?: string;
  role?: string;
  showManageInstitutes?: boolean;
}) {
  useEffect(() => {
    window.parent.postMessage(
      { type: "app-context", name: instituteName, subtitle, role, showManageInstitutes },
      "*"
    );
  }, [instituteName, role, showManageInstitutes, subtitle]);

  return null;
}
