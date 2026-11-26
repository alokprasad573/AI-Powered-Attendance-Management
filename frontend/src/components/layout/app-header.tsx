import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface AppHeaderProps {
  subtitle?: string;
  rightSlot?: ReactNode;
  homeHref?: string;
}

export function AppHeader({
  rightSlot,
  homeHref = "/",
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[#090A0B]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#090A0B]/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
        <Link
          href={homeHref}
          className="group flex shrink-0 items-center gap-2.5 rounded-[10px] focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] sm:gap-3"
        >
          <div className="relative h-9 w-9 overflow-hidden rounded-[10px] border border-[#B9D0D8]/25 bg-[var(--bg-secondary)] shadow-[inset_0_1px_0_rgba(245,246,246,0.14)] transition-colors duration-200 group-hover:border-[#B9D0D8]/50 sm:h-10 sm:w-10">
            <Image
              src="/brand/haziri-mark.svg"
              alt="Haziri.AI emblem"
              width={40}
              height={40}
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-semibold tracking-tight text-[var(--text-primary)] sm:text-xl">
                Haziri.AI
              </span>
            </div>
          </div>
        </Link>

        {rightSlot ? <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">{rightSlot}</div> : null}
      </div>
    </header>
  );
}
