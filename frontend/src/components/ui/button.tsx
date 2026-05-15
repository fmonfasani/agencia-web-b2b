"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base — común a todas las variantes
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-all duration-[120ms] ease-in outline-none select-none " +
    "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#475569] " +
    "active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-40 " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // ─ Primary: CTA oscuro — 1 por pantalla máximo
        default:
          "bg-[#111111] text-white hover:bg-[#1F1F1F] active:bg-[#000000]",

        // ─ Secondary: acciones secundarias brand (slate)
        secondary:
          "bg-[#475569] text-white hover:bg-[#334155] active:bg-[#1E293B]",

        // ─ AI Accent: EXCLUSIVO para funcionalidad IA (cobre)
        accent:
          "bg-[#E07A2F] text-white hover:bg-[#C96A22] active:bg-[#B35A18]",

        // ─ Outline: acciones terciarias
        outline:
          "border border-[#D6D3CE] bg-transparent text-[#111111] hover:bg-[#F7F6F3] active:bg-[#F1EFEA]",

        // ─ Ghost: acciones inline, navegación
        ghost:
          "bg-transparent text-[#6F6F6F] hover:bg-[#F7F6F3] hover:text-[#111111]",

        // ─ Danger: acciones destructivas
        destructive:
          "bg-[#EF4444] text-white hover:bg-[#DC2626] active:bg-[#B91C1C]",

        // ─ Link: texto plano con underline
        link: "text-[#475569] underline-offset-4 hover:underline bg-transparent",
      },
      size: {
        default: "h-9 px-4",
        xs: "h-7 px-3 text-xs rounded-md",
        sm: "h-8 px-3 text-sm",
        lg: "h-10 px-5 text-base",
        icon: "size-9",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
