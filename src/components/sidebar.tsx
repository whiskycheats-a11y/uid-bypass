"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  KeyRound,
  Users,
  Settings,
  ShieldCheck,
  FileText,
  Download,
  LogOut,
  Globe,
  MessageSquare,
  BellRing,
  Menu,
  Database,
  UserCircle,
  Crown,
  Star,
  User as UserIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnreadMentions, setHasUnreadMentions] = useState(false);

  // OPTIMIZED: Increased polling interval from 10s to 30s, added error handling
  const checkUnread = useCallback(async () => {
    const lastRead = localStorage.getItem("lastReadChatAt");
    if (!lastRead) return;
    try {
      const res = await fetch(`/api/chat/unread?lastRead=${encodeURIComponent(lastRead)}`);
      if (res.ok) {
        const data = await res.json();
        setHasUnreadMentions(data.hasUnread);
      }
    } catch {
      // Silently ignore network fetch errors
    }
  }, []);

  useEffect(() => {
    checkUnread();
    // OPTIMIZED: Poll every 30s instead of 10s to reduce network overhead
    const interval = setInterval(checkUnread, 30000);

    const handleRead = () => setHasUnreadMentions(false);
    window.addEventListener("chatRead", handleRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener("chatRead", handleRead);
    };
  }, [checkUnread]);

  const userRole = session?.user?.role || "RESELLER";
  const username = session?.user?.username || session?.user?.email || "User";

  const routes = [
    {
      title: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["RESELLER", "MANAGER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "UID Management",
      href: "/dashboard/uid-management",
      icon: KeyRound,
      roles: ["RESELLER", "MANAGER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "Free Portals",
      href: "/dashboard/free-portal",
      icon: Globe,
      roles: ["RESELLER", "MANAGER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "Team Chat",
      href: "/dashboard/team-chat",
      icon: MessageSquare,
      roles: ["RESELLER", "MANAGER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "API Access",
      href: "/dashboard/api-access",
      icon: Settings,
      roles: ["RESELLER", "MANAGER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "Documentation",
      href: "/dashboard/documentation",
      icon: FileText,
      roles: ["RESELLER", "MANAGER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "Downloads & Tools",
      href: "/dashboard/downloads",
      icon: Download,
      roles: ["RESELLER", "MANAGER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "Profile",
      href: "/dashboard/profile",
      icon: UserCircle,
      roles: ["RESELLER", "MANAGER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "User Management",
      href: "/dashboard/users",
      icon: Users,
      roles: ["MANAGER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "Limit Management",
      href: "/dashboard/limit-management",
      icon: Settings,
      roles: ["MANAGER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "UID Database",
      href: "/dashboard/uid-database",
      icon: Database,
      roles: ["MANAGER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "Manage Portals",
      href: "/dashboard/manage-portals",
      icon: Globe,
      roles: ["ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "System Alerts",
      href: "/dashboard/alerts",
      icon: BellRing,
      roles: ["ADMIN", "SUPER_ADMIN"],
    },
    {
      title: "System Config",
      href: "/dashboard/system-config",
      icon: Settings,
      roles: ["ADMIN", "SUPER_ADMIN"],
    },
  ];

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0a0a1a] border-b border-white/[0.08] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-blue-500/20">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-base font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-400">UID BYPASS</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-white">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* OPTIMIZED: Removed backdrop-blur-xl from sidebar, using solid bg instead */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-[#0a0a1a] md:bg-[#060610] border-r border-white/[0.08] transition-transform duration-300 md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-white/[0.08] hidden md:block">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-[0_0_20px_rgba(139,92,246,0.3)] group-hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-shadow duration-300">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-400">UID BYPASS</h2>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                Reseller
              </p>
            </div>
          </Link>
        </div>

        <div className="p-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-colors hover:bg-white/[0.06]">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10 shrink-0 shadow-sm">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(session?.user as any)?.profilePicture ? (
                /* eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-explicit-any */
                <img src={(session?.user as any)?.profilePicture as string} alt={username} className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-sm font-bold text-white truncate tracking-wide">
                {username}
              </span>
              <div className="flex items-center mt-0.5">
                  <Badge
                    variant={(userRole === "ADMIN" || userRole === "SUPER_ADMIN") ? "destructive" : userRole === "MANAGER" ? "default" : "outline"}
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 h-[16px] font-bold uppercase tracking-wider flex items-center gap-1",
                      (userRole === "ADMIN" || userRole === "SUPER_ADMIN") ? "bg-red-500/20 text-red-400 border-red-500/30" :
                        userRole === "MANAGER" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                          "bg-white/5 text-slate-400 border-white/10"
                    )}
                  >
                    {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && <Crown className="w-2.5 h-2.5" />}
                    {userRole === "MANAGER" && <Star className="w-2.5 h-2.5" />}
                    {userRole === "RESELLER" && <UserIcon className="w-2.5 h-2.5" />}
                    {userRole.replace("_", " ")}
                  </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {routes.map((route) => {
            if (!route.roles.includes(userRole)) return null;

            const isActive = pathname === route.href;
            const Icon = route.icon;

            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 group z-10",
                  isActive
                    ? "text-white"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.05)] -z-10"
                    initial={false}
                    animate={{ opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors z-10",
                    isActive ? "text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
                <span className="z-10 flex-1">{route.title}</span>
                {route.href === "/dashboard/team-chat" && hasUnreadMentions && (
                  <span className="z-10 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/[0.08] space-y-4">
          <Button
            variant="outline"
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>

          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              {"</>"} ZYTRONE
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
