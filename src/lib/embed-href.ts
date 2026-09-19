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
  overrides: QueryParams = {}
): string {
  const embed =
    overrides.embed ?? isEmbedValue(searchParams.get("embed"));
  const branch = overrides.branch !== undefined ? overrides.branch : searchParams.get("branch");
  const tab = overrides.tab ?? searchParams.get("tab") ?? undefined;

  const path = buildInstitutePath(instituteId, {
    tab: tab || undefined,
    branch,
    embed: false,
  });
  return embed ? addEmbedParam(path) : path;
}
