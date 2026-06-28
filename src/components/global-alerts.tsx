import { prisma } from "@/lib/prisma";
import { GlobalAlertsClient } from "./global-alerts-client";

export async function GlobalAlerts() {
  const now = new Date();
  
  const allAlerts = await prisma.systemAlert.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  const alerts = allAlerts.filter(alert => {
    if (alert.startsAt && alert.startsAt > now) return false;
    if (alert.endsAt && alert.endsAt < now) return false;
    return true;
  });

  if (alerts.length === 0) return null;

  return <GlobalAlertsClient alerts={alerts} />;
}
