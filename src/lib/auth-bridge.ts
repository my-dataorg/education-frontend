export const DEFAULT_BRIDGE_PATH = "/institutes";

function decodePath(value: string): string | null {
  let decoded = value;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (!decoded.includes("%")) return decoded;
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) return decoded;
      decoded = next;
    } catch {
      return null;
    }
  }
  return null;
}

function isSafePath(value: string): boolean {
  const decoded = decodePath(value);
  if (!decoded || !decoded.startsWith("/") || decoded.startsWith("//")) return false;
  if (decoded.includes("\\") || /[\u0000-\u001f]/.test(decoded)) return false;

  const pathname = decoded.split(/[?#]/, 1)[0];
  return !pathname.split("/").some((segment) => segment === "." || segment === "..");
}

export function safeBridgePath(value: string | null | undefined): string {
  const path = value?.trim() || "";
  return isSafePath(path) ? path : DEFAULT_BRIDGE_PATH;
}

export function bridgeDestination(nextPath: string | null | undefined, embed: boolean): string {
  const path = safeBridgePath(nextPath);
  if (!embed) return path;

  const url = new URL(path, "http://education.local");
  url.searchParams.set("embed", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}
