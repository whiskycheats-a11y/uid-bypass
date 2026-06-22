import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      email: true,
      // @ts-ignore: Prisma client hasn't fully synced on Windows due to dev server file lock
      profilePicture: true,
      role: true,
    }
  });

  if (!user) redirect("/login");

  return <ProfileClient user={user} />;
}
