import { DatabaseClient } from "./database-client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UidDatabasePage() {
  const session = await auth();

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    redirect("/dashboard");
  }

  return <DatabaseClient currentUserRole={session.user.role} />;
}
