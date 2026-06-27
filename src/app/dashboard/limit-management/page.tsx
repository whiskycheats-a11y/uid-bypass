import { LimitClient } from "./limit-client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LimitManagementPage() {
  const session = await auth();

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    redirect("/dashboard");
  }

  return <LimitClient session={session} />;
}
