"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PortalNavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  exact?: boolean;
}

export function PortalNav({
  items,
  label = "Portal sections",
}: {
  items: PortalNavItem[];
  label?: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="overflow-x-auto pb-1">
      <ul className="glass-layer-1 inline-flex min-w-full items-center gap-1.5 rounded-[14px] p-1.5 sm:min-w-0">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-200",
                  isActive
                    ? "border border-[#B9D0D8]/34 bg-[#22272A]/92 text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(185,208,216,0.22)] [&_svg]:text-[var(--accent-primary)]"
                    : "border border-transparent text-[var(--text-secondary)] hover:bg-[#22272A]/60 hover:text-[var(--text-primary)]"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
