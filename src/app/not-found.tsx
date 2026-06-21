import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#03030a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-30">
        <div className="absolute w-[600px] h-[600px] bg-red-600/20 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 text-center max-w-lg glass-premium p-10 rounded-3xl border border-white/10">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-6xl font-extrabold text-white tracking-tight mb-4">404</h1>
        <h2 className="text-2xl font-bold text-white mb-4">Target Not Found</h2>
        <p className="text-slate-400 mb-8 leading-relaxed">
          The endpoint you are looking for does not exist in this sector. You either took a wrong turn, or the evidence was already purged.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Return to Base
        </Link>
      </div>
    </div>
  );
}
