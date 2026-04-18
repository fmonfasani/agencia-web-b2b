import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex h-6 w-fit items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      status: {
        new: "bg-[#EAF2FF] text-[#3B82F6] border-[#BFDBFE]",
        contacted: "bg-[#F3EEFF] text-[#8B5CF6] border-[#DDD6FE]",
        qualified: "bg-[#E6F4EE] text-[#2E8B57] border-[#BBF7D0]",
        paused: "bg-[#FFF4E5] text-[#D97706] border-[#FED7AA]",
        won: "bg-[#111111] text-white border-[#111111]",
        lost: "bg-[#F7F6F3] text-[#9A9A9A] border-[#E5E3DF]",
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
