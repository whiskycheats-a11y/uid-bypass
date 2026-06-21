"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Users, Key, Box, Settings, Search, FileDown } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <AnimatePresence>
      {open && (
        <Command.Dialog 
          open={open} 
          onOpenChange={setOpen} 
          label="Global Command Menu"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden bg-[#0c0c14] border border-white/10 shadow-[0_0_50px_rgba(139,92,246,0.15)] flex flex-col"
          >
            <div className="flex items-center border-b border-white/10 px-4">
              <Search className="w-5 h-5 text-slate-400 mr-3" />
              <Command.Input 
                autoFocus
                placeholder="Search anything... (e.g., UIDs, Users)" 
                className="flex-1 h-14 bg-transparent text-white placeholder:text-slate-500 focus:outline-none text-lg"
              />
              <div className="text-[10px] text-slate-500 font-mono border border-white/10 rounded px-2 py-1 bg-white/5">ESC</div>
            </div>
            
            <Command.List className="max-h-[60vh] overflow-y-auto p-2 scroll-smooth hide-scrollbar">
              <Command.Empty className="p-6 text-center text-slate-400">No results found.</Command.Empty>
              
              <Command.Group heading={<div className="px-2 py-2 text-xs font-semibold text-slate-500">Navigation</div>}>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/dashboard"))}
                  className="flex items-center px-3 py-3 text-sm text-slate-300 rounded-lg hover:bg-white/5 cursor-pointer data-[selected=true]:bg-violet-500/20 data-[selected=true]:text-white transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 mr-3 text-violet-400" />
                  Overview
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/dashboard/uid-management"))}
                  className="flex items-center px-3 py-3 text-sm text-slate-300 rounded-lg hover:bg-white/5 cursor-pointer data-[selected=true]:bg-violet-500/20 data-[selected=true]:text-white transition-colors"
                >
                  <Key className="w-4 h-4 mr-3 text-amber-400" />
                  UID Management
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/dashboard/users"))}
                  className="flex items-center px-3 py-3 text-sm text-slate-300 rounded-lg hover:bg-white/5 cursor-pointer data-[selected=true]:bg-violet-500/20 data-[selected=true]:text-white transition-colors"
                >
                  <Users className="w-4 h-4 mr-3 text-blue-400" />
                  Reseller Users
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/dashboard/free-portal"))}
                  className="flex items-center px-3 py-3 text-sm text-slate-300 rounded-lg hover:bg-white/5 cursor-pointer data-[selected=true]:bg-violet-500/20 data-[selected=true]:text-white transition-colors"
                >
                  <Box className="w-4 h-4 mr-3 text-emerald-400" />
                  Free Portals
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/dashboard/downloads"))}
                  className="flex items-center px-3 py-3 text-sm text-slate-300 rounded-lg hover:bg-white/5 cursor-pointer data-[selected=true]:bg-violet-500/20 data-[selected=true]:text-white transition-colors"
                >
                  <FileDown className="w-4 h-4 mr-3 text-pink-400" />
                  Downloads & API
                </Command.Item>
              </Command.Group>

              <Command.Group heading={<div className="px-2 py-2 text-xs font-semibold text-slate-500 mt-2 border-t border-white/5">Settings</div>}>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/dashboard/system-config"))}
                  className="flex items-center px-3 py-3 text-sm text-slate-300 rounded-lg hover:bg-white/5 cursor-pointer data-[selected=true]:bg-violet-500/20 data-[selected=true]:text-white transition-colors"
                >
                  <Settings className="w-4 h-4 mr-3 text-slate-400" />
                  System Config
                </Command.Item>
              </Command.Group>
            </Command.List>
          </motion.div>
        </Command.Dialog>
      )}
    </AnimatePresence>
  );
}
