import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue-500/20 text-violet-300",
        success: "border-transparent bg-emerald-500/20 text-emerald-300",
        warning: "border-transparent bg-amber-500/20 text-amber-300",
        destructive: "border-transparent bg-red-500/20 text-red-300",
        outline: "border-white/10 text-slate-300",
        super_admin: "border-transparent bg-gradient-to-r from-red-600/30 to-orange-500/30 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-300 shadow-[0_0_15px_rgba(239,68,68,0.4)] ring-1 ring-red-500/50",
        admin: "border-transparent bg-gradient-to-r from-blue-600/30 to-violet-500/30 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-300 shadow-[0_0_10px_rgba(59,130,246,0.4)] ring-1 ring-blue-500/50",
        manager: "border-transparent bg-amber-500/20 text-amber-300",
        reseller: "border-transparent bg-emerald-500/20 text-emerald-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
