export function isInvalidSessionError(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized === "invalid token" || normalized === "missing token";
}
