import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        suppressHydrationWarning
        className={cn(
          "flex min-h-11 w-full rounded-[10px] border border-[var(--border-default)] bg-[#060708]/88 px-3.5 py-2.5 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-[border-color,background-color,box-shadow] duration-200 focus:border-[#B9D0D8]/65 focus:bg-[#090A0B] focus:shadow-[0_0_0_3px_rgba(185,208,216,0.12)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-55 aria-[invalid=true]:border-[#DF848E] sm:text-sm",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
