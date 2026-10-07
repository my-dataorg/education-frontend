"use client";

import { useEffect } from "react";

export function EducationContextReporter({ instituteName }: { instituteName: string }) {
  useEffect(() => {
    window.parent.postMessage({ type: "education-context", name: instituteName }, "*");
  }, [instituteName]);

  return null;
}
