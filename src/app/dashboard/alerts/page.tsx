import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AlertsClient, DeleteAlertButton } from "./alerts-client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default async function AlertsManagementPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const alerts = await prisma.systemAlert.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          System Alerts
        </h1>
        <p className="text-slate-400">
          Admin portal to broadcast global alerts across all user dashboards.
        </p>
      </div>

      <AlertsClient />

      <div>
        <h2 className="text-xl font-bold text-white mb-6">Active & Past Alerts</h2>
        
        <div className="glass-card overflow-hidden">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No alerts have been created yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-white/[0.04] text-slate-400 border-b border-white/[0.08]">
                  <tr>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Message</th>
                    <th className="px-6 py-4 font-medium">Created</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-[10px] tracking-wider">
                          {alert.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-200">
                        {alert.message}
                      </td>
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                        {format(alert.createdAt, "MMM d, yyyy HH:mm")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DeleteAlertButton id={alert.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
