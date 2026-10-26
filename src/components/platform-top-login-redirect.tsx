"use client";

import { useEffect } from "react";

export function PlatformTopLoginRedirect({ loginUrl }: { loginUrl: string }) {
  useEffect(() => {
    const target = window.top ?? window;
    if (target.location.href !== loginUrl) {
      target.location.href = loginUrl;
    }
  }, [loginUrl]);

  return (
    <p className="text-center text-sm text-muted-foreground">
      Your session expired. Redirecting to sign in…
    </p>
  );
}
