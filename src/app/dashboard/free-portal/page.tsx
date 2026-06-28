import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FreePortalClient } from "./free-portal-client";


export default async function FreePortalPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Fetch the user's free portal limit and existing portals
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      portals: {
        orderBy: { createdAt: "desc" },
      }
    }
  });

  if (!user) redirect("/login");

  const freeUidLimitDisplay = (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? "Unlimited" : user.freeUidLimit;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Free Portals
        </h1>
        <p className="text-slate-400">
          Generate temporary links to give your clients free UID bypass access.
        </p>
      </div>

      <FreePortalClient 
        freeUidLimit={freeUidLimitDisplay} 
        initialPortals={user.portals} 
      />
    </div>
  );
}
