"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { bridgeDestination, safeBridgePath } from "@/lib/auth-bridge";

function BridgeInner() {
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get("code")?.trim();
    const nextPath = safeBridgePath(params.get("next"));
    const dest = bridgeDestination(nextPath, params.get("embed") === "1");

    // Raw platform JWTs are never accepted in a browser URL.
    if (!code || params.has("pt")) {
      window.location.replace("/login");
      return;
    }

    void signIn("platform-handoff", { code, returnPath: nextPath, callbackUrl: dest });
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
