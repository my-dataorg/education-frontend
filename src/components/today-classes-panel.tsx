import Link from "next/link";
import type { TodayClass } from "@/lib/api";
import { todayClassLabel } from "@/lib/utils";

export function TodayClassesPanel({
  items,
  error,
}: {
  items: TodayClass[];
  error?: string;
}) {
  return (
    <section>
      <h2 className="font-medium">To-do</h2>
      <p className="mt-1 text-sm text-muted-foreground">Classes scheduled for today</p>
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        {error ? (
          <p className="text-sm text-muted-foreground">Could not load today&apos;s classes.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classes scheduled for today.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.periodId}>
                <Link
                  href={`${item.href}?subjectId=${encodeURIComponent(item.subjectId)}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {todayClassLabel(item)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
