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
        admin: "border-transparent bg-red-500/20 text-red-300",
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
