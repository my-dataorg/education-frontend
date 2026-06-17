import { ROLE_LABELS, shortId } from "@/lib/roles";

export type UserIdentityFields = {
  userId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  userEmail?: string | null;
  username?: string;
  role?: string;
};

export function formatUserName(user: UserIdentityFields): string {
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first || last) return (first || last)!;
  if (user.displayName?.trim()) return user.displayName.trim();
  const email = (user.email || user.userEmail || "").trim();
  if (email) return email;
  if (user.username?.trim()) return user.username.trim();
  return shortId(user.userId);
}

export function UserIdentity({
  user,
  role,
  className = "",
}: {
  user: UserIdentityFields;
  role?: string;
  className?: string;
}) {
  const label = formatUserName(user);
  const roleLabel = role ? ROLE_LABELS[role] || role : null;
  const email = (user.email || user.userEmail || "").trim();

  return (
    <span className={`group relative inline-flex cursor-default ${className}`}>
      <span className="font-medium text-foreground">{label}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden min-w-[12rem] max-w-xs rounded-lg border border-border bg-card p-3 text-left text-xs shadow-lg group-hover:block"
      >
        <p className="font-semibold text-foreground">{label}</p>
        {roleLabel && (
          <p className="mt-1 text-muted-foreground">
            Role: <span className="text-foreground">{roleLabel}</span>
          </p>
        )}
        {email && (
          <p className="mt-1 text-muted-foreground">
            Email: <span className="text-foreground">{email}</span>
          </p>
        )}
        {user.username && (
          <p className="mt-1 text-muted-foreground">
            Username: <span className="text-foreground">{user.username}</span>
          </p>
        )}
        <p className="mt-1 break-all text-muted-foreground">
          User ID: <span className="font-mono text-[10px] text-foreground">{user.userId}</span>
        </p>
      </span>
    </span>
  );
}

export function inviteeLabel(inv: {
  inviteeEmail?: string;
  inviteeUserId?: string;
  inviteeFirstName?: string;
  inviteeLastName?: string;
  inviteeDisplayName?: string;
  inviteeUsername?: string;
}): string {
  return formatUserName({
    userId: inv.inviteeUserId || inv.inviteeEmail || "unknown",
    firstName: inv.inviteeFirstName,
    lastName: inv.inviteeLastName,
    displayName: inv.inviteeDisplayName,
    email: inv.inviteeEmail,
    username: inv.inviteeUsername,
  });
}
