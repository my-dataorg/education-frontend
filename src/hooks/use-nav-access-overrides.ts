"use client";

import { useEffect, useState } from "react";
import { parseNavAccessOverrides, type NavAccessOverrides } from "@/lib/nav-access";

export function useNavAccessOverrides(instituteId: string): NavAccessOverrides {
  const [overrides, setOverrides] = useState<NavAccessOverrides>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/institutes/${instituteId}/nav-access`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((body) => {
        if (cancelled || !body) return;
        setOverrides(parseNavAccessOverrides(body.overrides));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [instituteId]);

  return overrides;
}
