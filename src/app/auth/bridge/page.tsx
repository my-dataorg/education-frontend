"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function BridgeInner() {
  const params = useSearchParams();

  useEffect(() => {
    const accessToken = params.get("pt")?.trim();
    const nextPath = params.get("next") || "/institutes";
    const embed = params.get("embed") === "1";
    const safeNext = nextPath.startsWith("/") ? nextPath : "/institutes";
    const dest = embed
      ? `${safeNext}${safeNext.includes("?") ? "&" : "?"}embed=1`
      : safeNext;

    if (!accessToken) {
      window.location.replace("/login");
      return;
    }

    void signIn("platform-token", { accessToken, callbackUrl: dest });
  }, [params]);

  return <p className="p-6 text-sm text-muted-foreground">Opening Education…</p>;
}

export default function AuthBridgePage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Opening Education…</p>}>
      <BridgeInner />
    </Suspense>
  );
}
