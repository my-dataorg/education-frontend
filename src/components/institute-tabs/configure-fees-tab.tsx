"use client";

import { FeesCatalog } from "@/components/configure-fees/fees-catalog";

export function ConfigureFeesTab({ instituteId }: { instituteId: string }) {
  return <FeesCatalog instituteId={instituteId} />;
}
