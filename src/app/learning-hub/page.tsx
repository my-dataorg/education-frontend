import { auth } from "@/auth";
import { EduNavGate } from "@/components/edu-nav-gate";
import { redirect } from "next/navigation";

export default async function LearningHubPage() {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  return (
    <>
      <EduNavGate />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Learning hub</h1>
      </main>
    </>
  );
}
