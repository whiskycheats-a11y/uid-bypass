import { Sidebar } from "@/components/sidebar";
import { GlobalAlerts } from "@/components/global-alerts";
import { CommandPalette } from "@/components/command-palette";
import { auth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#030308] overflow-hidden relative">
      {/* OPTIMIZED: Reduced gradient opacity from 0.35 to 0.15, removed external noise SVG entirely */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.15),transparent_50%)] pointer-events-none z-0" />
      
      <div className="relative z-10 flex flex-col md:flex-row w-full h-full">
        <Sidebar initialSession={session} />
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
