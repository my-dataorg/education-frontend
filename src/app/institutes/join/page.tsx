import { auth } from "@/auth";
import { JoinInstituteForm } from "@/app/institutes/join/join-form";
import { EduNavGate } from "@/components/edu-nav-gate";
import { redirect } from "next/navigation";

export default async function JoinInstitutePage() {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");
  return (
    <>
      <EduNavGate />
      <JoinInstituteForm />
    </>
  );
}
