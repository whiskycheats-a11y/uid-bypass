"use client";

import { ReactNode } from "react";

// OPTIMIZED: Replaced framer-motion with pure CSS fade-in animation
export function PageWrapper({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`animate-fade-in ${className || ""}`}>
      {children}
    </div>
  );
}
