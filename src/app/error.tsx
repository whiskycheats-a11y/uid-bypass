"use client";

import { useEffect } from "react";
import { ServerCrash, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#03030a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-30">
        <div className="absolute w-[600px] h-[600px] bg-amber-600/20 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 text-center max-w-lg glass-premium p-10 rounded-3xl border border-white/10">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
          <ServerCrash className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">System Failure</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Our internal infrastructure just encountered a fatal exception. The network might be under stress or a query timed out. 
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            onClick={() => reset()}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white border-0 shadow-lg shadow-amber-600/20"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reboot Interface
          </Button>
        </div>
      </div>
    </div>
  );
}
