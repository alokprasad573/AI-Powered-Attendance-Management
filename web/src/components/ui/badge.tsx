import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-[0.015em]",
  {
    variants: {
      variant: {
        default: "border-[#B9D0D8]/30 bg-[#B9D0D8]/10 text-[#DCE9EE]",
        present: "border-[#76C4A4]/32 bg-[#76C4A4]/12 text-[#ABE4CD]",
        override: "border-[#CDBF9D]/36 bg-[#CDBF9D]/12 text-[#ECE3CE]",
        absent: "border-[#DF848E]/32 bg-[#DF848E]/12 text-[#F3BEC4]",
        neural: "border-[#91AAB4]/34 bg-[#91AAB4]/12 text-[#CBD9DF]",
        neutral:
          "border-[var(--border-default)] bg-[#22272A]/72 text-[var(--text-secondary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
