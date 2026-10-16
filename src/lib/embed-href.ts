import { addEmbedParam, isEmbedValue } from "@/lib/embed";

type QueryParams = {
  tab?: string;
  branch?: string | null;
  embed?: boolean;
};

export function buildInstitutePath(instituteId: string, params: QueryParams = {}): string {
  const sp = new URLSearchParams();
  if (params.tab) sp.set("tab", params.tab);
  if (params.branch) sp.set("branch", params.branch);
  if (params.embed) sp.set("embed", "1");
  const qs = sp.toString();
  return `/institutes/${instituteId}${qs ? `?${qs}` : ""}`;
}

/** Preserve embed + branch from current URL when building institute links */
export function buildInstitutePathFromSearch(
  instituteId: string,
  searchParams: URLSearchParams,
  overrides: QueryParams & Record<string, string | null | undefined> = {}
): string {
  const embed =
    overrides.embed ?? isEmbedValue(searchParams.get("embed"));
  const sp = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(overrides)) {
    if (key === "embed" || key === "branch") continue;
    if (value === undefined || value === null || value === "") sp.delete(key);
    else sp.set(key, String(value));
  }
  const branch =
    overrides.branch !== undefined ? overrides.branch : sp.get("branch");
  if (branch) sp.set("branch", branch);
  else sp.delete("branch");

  const qs = sp.toString();
  const path = `/institutes/${instituteId}${qs ? `?${qs}` : ""}`;
  return embed ? addEmbedParam(path) : path;
}
