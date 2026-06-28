import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuditClient from "./audit-client";

export default async function AuditLogsPage() {
  const session = await auth();

  // ONLY Super Admin can access
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return <AuditClient />;
}
