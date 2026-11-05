import { labJson } from "@/lib/lab-bff";

export async function POST() {
  return labJson("/v1/lab/stop", { method: "POST" });
}
