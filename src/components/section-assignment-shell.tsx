"use client";

type Props = {
  title?: string;
  description?: string;
  canManage: boolean;
  assigned: React.ReactNode;
  picker?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  error?: string;
  fillHeight?: boolean;
};

export function SectionAssignmentShell({
  title,
  description,
  canManage,
  assigned,
  picker,
  actions,
  tabs,
  error,
  fillHeight = false,
}: Props) {
  const showHeader = Boolean(title || description);

  return (
    <div className={fillHeight ? "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden" : "space-y-4"}>
      {showHeader ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {canManage ? description : `${description} View only — you cannot change assignments.`}
                </p>
              )}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
          {tabs}
        </>
      ) : (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">{tabs}</div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}

      {error && (
        <p className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div
        className={
          fillHeight
            ? "flex min-h-0 flex-1 flex-col"
            : canManage && picker
              ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]"
              : "max-w-3xl"
        }
      >
        <div
          className={
            fillHeight
              ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm"
              : "rounded-xl border border-border bg-card p-4 shadow-sm"
          }
        >
          {assigned}
        </div>
        {canManage && picker && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
            {picker}
          </div>
        )}
      </div>
    </div>
  );
}

export function PersonRow({
  userId,
  name,
  subtitle,
  onRemove,
}: {
  userId: string;
  name: string;
  subtitle?: string;
  onRemove?: () => void;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
          aria-hidden
        >
          {initials || "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-xs font-medium text-destructive hover:underline"
        >
          Remove
        </button>
      )}
    </li>
  );
}

export function AssignedGroup({
  label,
  count,
  empty,
  children,
  scrollable = false,
  fillRemaining = false,
}: {
  label: string;
  count: number;
  empty: string;
  children: React.ReactNode;
  scrollable?: boolean;
  fillRemaining?: boolean;
}) {
  return (
    <section
      className={
        scrollable && fillRemaining
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
          : scrollable
            ? "mt-5 first:mt-0"
            : "mt-5 first:mt-0"
      }
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      {count === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul
          className={
            scrollable
              ? `mt-2 space-y-1.5 overflow-y-auto overscroll-y-contain pr-0.5 ${
                  fillRemaining ? "min-h-0 flex-1" : "max-h-[calc(100dvh-17rem)]"
                }`
              : "mt-2 space-y-1.5"
          }
        >
          {children}
        </ul>
      )}
    </section>
  );
}
