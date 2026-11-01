import { NextRequest } from "next/server";
import { labJson } from "@/lib/lab-bff";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") ?? "";
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  return labJson(`/v1/lab/browse${query}`, { method: "GET" });
}
