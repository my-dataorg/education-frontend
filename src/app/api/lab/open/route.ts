import { NextRequest } from "next/server";
import { labJson } from "@/lib/lab-bff";

export async function POST(req: NextRequest) {
  const body = await req.json();
  return labJson("/v1/lab/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: body.path ?? "" }),
  });
}
