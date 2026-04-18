import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex h-6 w-fit items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      status: {
        new: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
        contacted: "bg-[#FFFBEB] text-[#92400E] border-[#FED7AA]",
        qualified: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
        paused: "bg-[#FFF7ED] text-[#EA580C] border-[#FDBA74]",
        won: "bg-[#111111] text-white border-[#000000]",
        lost: "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]",
      },
    },
    defaultVariants: {
      status: "new",
    },
  },
);

function StatusBadge({
  status = "new",
  className,
  children,
  ...props
}: {
  status?: "new" | "contacted" | "qualified" | "paused" | "won" | "lost";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props}>
      {children}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
