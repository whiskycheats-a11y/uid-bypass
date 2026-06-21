"use client";

import { ReactNode } from "react";
import { Card, CardContent } from "./ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  delay?: number;
  color?: "violet" | "amber" | "emerald" | "red" | "blue";
}

export function StatCard({
  title,
  value,
  icon,
  description,
  trend,
  delay = 0,
  color = "violet",
}: StatCardProps) {
  const colorMap = {
    violet: "from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20 shadow-blue-500/10",
    amber: "from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/20 shadow-amber-500/10",
    emerald: "from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10",
    red: "from-red-500/20 to-red-600/5 text-red-400 border-red-500/20 shadow-red-500/10",
    blue: "from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20 shadow-blue-500/10",
  };

  const bgGradientMap = {
    violet: "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30",
    amber: "bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/30",
    emerald: "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30",
    red: "bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30",
    blue: "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30",
  };

  // OPTIMIZED: Replaced framer-motion with CSS animations for card entrance + hover
  return (
    <div
      className="animate-fade-in-up hover:-translate-y-1 transition-transform duration-200"
      style={{ animationDelay: `${delay}s` }}
    >
      <Card className={cn("overflow-hidden group transition-colors duration-200 relative border", colorMap[color])}>
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", colorMap[color].split(" ")[0], colorMap[color].split(" ")[1])} />
        
        <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-400">{title}</p>
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {value}
              </h3>
            </div>
            <div className={cn("p-3 rounded-xl shadow-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110", bgGradientMap[color])}>
              <div className="text-white w-5 h-5 flex items-center justify-center">
                {icon}
              </div>
            </div>
          </div>

          {(description || trend) && (
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              {description && (
                <p className="text-xs text-slate-400">{description}</p>
              )}
              {trend && (
                <div className="flex items-center space-x-1">
                  <span
                    className={cn(
                      "text-xs font-bold",
                      trend.isPositive ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {trend.isPositive ? "+" : ""}
                    {trend.value}%
                  </span>
                  <span className="text-xs text-slate-500">{trend.label}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
