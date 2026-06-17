import Link from "next/link";
import { EduNavGate } from "@/components/edu-nav-gate";

export function SubscriptionRequired({
  title = "Education subscription required",
  description = "Subscribe to Education in the platform marketplace to access institutes, staff tools, and courses.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <>
      <EduNavGate />
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <Link
          href="http://localhost:3000/marketplace"
          className="mt-8 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Subscribe in marketplace
        </Link>
        <p className="mt-6 text-sm text-muted-foreground">
          Already subscribed?{" "}
          <Link href="/institutes" className="text-primary hover:underline">
            Refresh institutes
          </Link>
        </p>
      </main>
    </>
  );
}

export function isSubscriptionError(message: string): boolean {
  return message.toLowerCase().includes("subscription");
}
