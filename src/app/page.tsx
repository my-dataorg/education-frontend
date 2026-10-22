import { auth } from "@/auth";
import { addEmbedParam } from "@/lib/embed";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const headerStore = await headers();
  const embedded =
    headerStore.get("x-edu-embed") === "1" || cookieStore.get("edu-embed")?.value === "1";
  redirect(embedded ? addEmbedParam("/institutes") : "/institutes");
}
