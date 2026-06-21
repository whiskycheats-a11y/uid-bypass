import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UidClient } from "./uid-client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function UidManagementPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = parseInt(session.user.id);

  // Fetch the user's UIDs to display in the interactive table
  const uids = await prisma.uid.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      uidValue: true,
      duration: true,
      createdAt: true,
      expiresAt: true,
      status: true,
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          UID Management
        </h1>
        <p className="text-slate-400">
          Add, extend, replace, or remove UID access. Paid actions cost 1 UID limit.
        </p>
      </div>

      <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
        <UidClient initialUids={uids} />
      </Suspense>
    </div>
  );
}
