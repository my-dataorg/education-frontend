export function isEmbedValue(value: string | null | undefined): boolean {
  return value === "1";
}

export function isEmbedPath(path: string): boolean {
  const url = new URL(path, "http://education.local");
  return isEmbedValue(url.searchParams.get("embed"));
}

export function addEmbedParam(path: string): string {
  const url = new URL(path, "http://education.local");
  url.searchParams.set("embed", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}
