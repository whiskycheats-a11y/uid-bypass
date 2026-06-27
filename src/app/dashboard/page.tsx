import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/stat-card";
import { ActivityFeed } from "@/components/activity-feed";
import { ShieldCheck, KeyRound, Globe, Users, Activity, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/page-wrapper";
import { DashboardChart } from "@/components/dashboard-chart";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // If the user has a corrupted session from the previous bug, log them out to clear the cookie
  if (userId === "super-admin-override" || !/^[0-9a-fA-F]{24}$/.test(userId)) {
    redirect("/api/force-logout");
  }
  
  // Fetch real-time user data
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        uidLimit: true,
        freeUidLimit: true,
        role: true,
        _count: {
          select: {
            uids: { where: { status: "ACTIVE" } },
            createdUsers: true,
            portals: true,
          }
        }
      }
    });
  } catch (error) {
    // If any Prisma error occurs (e.g. malformed ID), force logout
    redirect("/api/force-logout");
  }

  if (!user) redirect("/login");

  // Generate chart data for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentUids = await prisma.uid.findMany({
    where: {
      userId: (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") ? undefined : userId,
      createdAt: { gte: sevenDaysAgo }
    },
    select: { createdAt: true }
  });

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const chartDataMap: Record<string, number> = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    chartDataMap[days[d.getDay()]] = 0;
  }

  recentUids.forEach(uid => {
    const dayName = days[new Date(uid.createdAt).getDay()];
    if (chartDataMap[dayName] !== undefined) {
      chartDataMap[dayName]++;
    }
  });

  const chartData = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dayName = days[d.getDay()];
    chartData.push({ name: dayName, uids: chartDataMap[dayName] });
  }

  return (
    <PageWrapper className="space-y-8 relative">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Dashboard Overview
        </h1>
        <p className="text-slate-400">
          Welcome back. Here&apos;s a summary of your UID Bypass statistics.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Paid UID Limit"
          value={user.uidLimit}
          icon={<ShieldCheck className="w-5 h-5" />}
          color="violet"
          description="Available for Add/Extend"
          delay={0.1}
        />
        <StatCard
          title="Free UID Limit"
          value={(user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? "Unlimited" : user.freeUidLimit}
          icon={<Globe className="w-5 h-5" />}
          color="amber"
          description="Resets every 2 weeks"
          delay={0.2}
        />
        <StatCard
          title="Active UIDs"
          value={user._count.uids}
          icon={<KeyRound className="w-5 h-5" />}
          color="emerald"
          description="Currently active in the system"
          delay={0.3}
        />
        {(user.role === "MANAGER" || user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? (
          <StatCard
            title="Total Users"
            value={user._count.createdUsers}
            icon={<Users className="w-5 h-5" />}
            color="blue"
            description="Users created by you"
            delay={0.4}
          />
        ) : (
          <StatCard
            title="Active Portals"
            value={user._count.portals}
            icon={<Globe className="w-5 h-5" />}
            color="blue"
            description="Free Portals generated"
            delay={0.4}
          />
        )}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-premium rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              UID Activation Trends
            </h2>
            <DashboardChart data={chartData} />
          </div>
          
          <div className="glass-premium rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/dashboard/uid-management" className="group">
                <div className="glass-premium hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] hover:-translate-y-1 p-6 rounded-2xl transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <KeyRound className="w-8 h-8 text-blue-400 mb-4" />
                  <h3 className="font-medium text-white mb-1">UID Management</h3>
                  <p className="text-sm text-slate-400">Add, Extend, Replace, or Remove UIDs.</p>
                </div>
              </Link>
              
              <Link href="/dashboard/free-portal" className="group">
                <div className="glass-premium hover:shadow-[0_0_40px_rgba(245,158,11,0.15)] hover:-translate-y-1 p-6 rounded-2xl transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Globe className="w-8 h-8 text-amber-400 mb-4" />
                  <h3 className="font-medium text-white mb-1">Free Portals</h3>
                  <p className="text-sm text-slate-400">Generate links to give clients free access.</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="glass-premium rounded-2xl p-6 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <Link href="/dashboard/uid-management">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                View All
              </Button>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            <ActivityFeed userId={userId} limit={8} />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
