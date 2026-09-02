import Link from "next/link";
import type { PendingWorkItem } from "@/lib/api";

export function PendingWorkPanel({
  items,
  error,
}: {
  items: PendingWorkItem[];
  error?: string;
}) {
  return (
    <section>
          <h2 className="font-medium">Incomplete work</h2>
          <p className="mt-1 text-sm text-muted-foreground">Assignments by deadline</p>
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        {error ? (
          <p className="text-sm text-muted-foreground">Could not load to-do.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={`${item.kind}-${index}`} className="text-sm">
                {item.href ? (
                  <Link href={item.href} className="font-medium text-primary hover:underline">
                    {item.title}
                  </Link>
                ) : (
                  <span className="font-medium">{item.title}</span>
                )}
                <p className="text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
