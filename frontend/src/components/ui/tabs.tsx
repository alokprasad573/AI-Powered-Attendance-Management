"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex w-full items-center gap-1.5 rounded-[12px] border border-[var(--border-hairline)] bg-[#060708]/85 p-1",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    suppressHydrationWarning
    className={cn(
      "inline-flex flex-1 min-h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[9px] border border-transparent px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-[background-color,border-color,color,box-shadow] duration-200 hover:text-[var(--text-primary)] data-[state=active]:border-[#B9D0D8]/34 data-[state=active]:bg-[#22272A] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-[inset_0_1px_0_rgba(185,208,216,0.22)] data-[state=active]:[&_svg]:text-[var(--accent-primary)]",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
