import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-[14px] border p-4 text-sm leading-relaxed",
  {
    variants: {
      variant: {
        info: "border-[#B9D0D8]/28 bg-[#B9D0D8]/[0.07] text-[#E6EFF2]",
        success: "border-[#76C4A4]/30 bg-[#76C4A4]/[0.08] text-[#DCF2E9]",
        warning: "border-[#CDBF9D]/34 bg-[#CDBF9D]/[0.08] text-[#EFE8D7]",
        error: "border-[#DF848E]/34 bg-[#DF848E]/[0.09] text-[#F6D7DB]",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}
