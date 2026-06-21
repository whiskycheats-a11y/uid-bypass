import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DownloadsClient } from "./downloads-client";
import { prisma } from "@/lib/prisma";

export default async function DownloadsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { uidLimit: true }
  });

  return <DownloadsClient uidLimit={user?.uidLimit || 0} />;
}
