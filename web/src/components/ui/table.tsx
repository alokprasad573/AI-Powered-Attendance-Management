import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div
      className="data-surface relative w-full overflow-x-auto rounded-[16px]"
      tabIndex={0}
      role="region"
      aria-label="Data table"
    >
      <table
        className={cn("w-full min-w-[600px] caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "border-b border-[var(--border-default)] bg-[#22272A]/60",
        className
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("divide-y divide-[var(--border-hairline)]", className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "transition-colors duration-150 hover:bg-[#22272A]/48",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  scope = "col",
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope={scope}
      className={cn(
        "h-11 px-4 text-left align-middle text-xs font-medium text-[var(--text-secondary)]",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-4 py-3.5 align-middle text-[var(--text-primary)]", className)}
      {...props}
    />
  );
}
