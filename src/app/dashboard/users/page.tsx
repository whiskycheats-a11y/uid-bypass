import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import UsersClient from "./users-client";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = parseInt(session.user.id);
  const userRole = session.user.role;

  // Only Admin and Manager can access
  if (userRole === "RESELLER") {
    redirect("/dashboard");
  }

  const whereClause = userRole === "ADMIN" ? {} : { createdBy: userId };
  
  const initialUsers = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      uidLimit: true,
      freeUidLimit: true,
      profilePicture: true,
      createdAt: true,
      createdBy: true,
    },
    orderBy: { id: "desc" }
  });

  // Serialize dates to prevent Next.js errors
  const serializedUsers = initialUsers.map(u => ({
    ...u,
    createdAt: u.createdAt.toISOString()
  }));

  return <UsersClient initialUsers={serializedUsers} currentUserRole={userRole} currentUserId={userId} />;
}
