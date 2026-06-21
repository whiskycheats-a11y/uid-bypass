import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ChatClient } from "./chat-client";

export default async function TeamChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = parseInt(session.user.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Team Chat
        </h1>
        <p className="text-slate-400">
          Connect with other resellers, managers, and admins in real-time.
        </p>
      </div>

      <ChatClient currentUsername={user.username} />
    </div>
  );
}
