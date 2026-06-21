import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ConfigClient } from "./config-client";

export default async function SystemConfigPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          System Configuration
        </h1>
        <p className="text-slate-400">
          Manage webhooks, API keys, and registration rules dynamically without needing server restarts.
        </p>
      </div>

      <ConfigClient />
    </div>
  );
}
