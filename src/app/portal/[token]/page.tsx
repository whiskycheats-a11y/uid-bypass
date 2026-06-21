import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PortalClient } from "./portal-client";

export default async function PublicPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  const portal = await prisma.freePortal.findUnique({
    where: { token: token },
  });

  if (!portal) {
    notFound();
  }

  // Check if expired
  if (portal.expiresAt && portal.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="glass-premium max-w-md w-full p-8 rounded-3xl text-center border border-white/[0.08]">
          <h1 className="text-2xl font-bold text-white mb-2">Portal Expired</h1>
          <p className="text-slate-400">
            This free portal link has expired and is no longer accepting new activations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PortalClient 
      portalToken={portal.token} 
      brandName={portal.brandName} 
      durationHours={portal.durationHours} 
    />
  );
}
