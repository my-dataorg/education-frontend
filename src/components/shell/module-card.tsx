import Link from "next/link";
import { cn } from "@/lib/utils";

export function ModuleCard({
  icon,
  title,
  description,
  href,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-shell text-shell-foreground">
        {icon}
      </div>
      <div className="mt-4">
        <h3 className="font-serif text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </>
  );
  const classes = cn(
    "block rounded-xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md",
    className
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn(classes, "w-full text-left")}>
      {inner}
    </button>
  );
}
