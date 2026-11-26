import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)] cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "border border-[#B9D0D8]/65 bg-[#B9D0D8] text-[#090A0B] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_24px_-12px_rgba(185,208,216,0.4)] hover:bg-[#C9DCE3] active:scale-[0.985]",
        secondary:
          "border border-[#91AAB4]/30 bg-[#22272A]/90 text-[#F5F6F6] shadow-[inset_0_1px_0_rgba(245,246,246,0.1)] hover:border-[#B9D0D8]/42 hover:bg-[#2B3135] active:scale-[0.985]",
        outline:
          "border border-[var(--border-default)] bg-[#141719]/68 text-[#F5F6F6] hover:border-[#B9D0D8]/40 hover:bg-[#22272A]/78",
        ghost:
          "text-[var(--text-secondary)] hover:bg-[#22272A]/65 hover:text-[var(--text-primary)]",
        destructive:
          "border border-[#B9D0D8]/65  text-[#F5F6F6] hover:border-[#DF848E]/55 hover:bg-[#DF848E]/20 hover:text-[#DF848E]/55",
        warning:
          "border border-[#B9D0D8]/65  text-[#F5F6F6] hover:border-[#CDBF9D]/58 hover:bg-[#CDBF9D]/20 hover:text-[#CDBF9D]/55",
      },
      size: {
        default: "min-h-11 px-5 py-2.5",
        sm: "min-h-9 px-3.5 py-1.5 text-xs",
        lg: "min-h-12 px-6 py-3 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        suppressHydrationWarning
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
