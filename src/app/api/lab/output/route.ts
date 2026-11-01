import { labJson } from "@/lib/lab-bff";

export async function GET() {
  return labJson("/v1/lab/output", { method: "GET" });
}
