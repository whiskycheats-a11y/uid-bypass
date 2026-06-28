import { Sidebar } from "@/components/sidebar";
import { GlobalAlerts } from "@/components/global-alerts";
import { CommandPalette } from "@/components/command-palette";
import { auth } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  let apiAccessEnabled = true;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { apiAccessEnabled: true }
    });
    apiAccessEnabled = user?.apiAccessEnabled ?? true;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#06060f] overflow-hidden relative">
      {/* PREMIUM BACKGROUND EFFECTS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-float-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-600/20 rounded-full blur-[120px] mix-blend-screen animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-[40%] left-[60%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[100px] mix-blend-screen animate-float" style={{ animationDelay: '-5s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>
      
      <div className="relative z-10 flex flex-col md:flex-row w-full h-full">
        <Sidebar initialSession={session} apiAccessEnabled={apiAccessEnabled} />
        <main className="flex-1 h-full overflow-y-auto relative z-10 scroll-smooth hide-scrollbar">
          <div className="container max-w-7xl mx-auto p-4 md:p-8">
            <GlobalAlerts />
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
