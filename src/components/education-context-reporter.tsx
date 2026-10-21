"use client";

import { useEffect } from "react";

function clearShellContext() {
  window.parent.postMessage(
    {
      type: "app-context",
      name: "",
      subtitle: "",
      role: "",
      showManageInstitutes: false,
      showManageBusinesses: false,
    },
    "*"
  );
}

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
    return clearShellContext;
  }, [instituteName, role, showManageInstitutes, subtitle]);

  return null;
}
