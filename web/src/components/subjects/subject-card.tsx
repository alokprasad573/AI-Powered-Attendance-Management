import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface SubjectStatPill {
  icon: ReactNode;
  label: string;
  value: string | number;
}

interface SubjectCardProps {
  name: string;
  code: string;
  section: string;
  stats: SubjectStatPill[];
  footer?: ReactNode;
}

export function SubjectCard({
  name,
  code,
  section,
  stats,
  footer,
}: SubjectCardProps) {
  return (
    <article className="h-full">
      <Card className="spatial-glass-glow relative flex h-full flex-col justify-between overflow-hidden">
        {/* Subtle top platinum accent hairline */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#B9D0D8]/45 to-transparent"
        />

        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="neural">
              Code: <span className="telemetry-num">{code}</span>
            </Badge>
            <Badge variant="neutral">
              Section: <span className="telemetry-num">{section}</span>
            </Badge>
          </div>
          <CardTitle className="pt-2.5 text-xl">{name}</CardTitle>
        </CardHeader>

        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-2.5">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="glass-row inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-xs text-[var(--text-secondary)]"
              >
                <span className="text-[var(--accent-primary)]" aria-hidden="true">
                  {stat.icon}
                </span>
                <span className="telemetry-num font-medium text-[var(--text-primary)]">
                  {stat.value}
                </span>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </CardContent>

        {footer ? (
          <CardFooter className="border-t border-[var(--border-hairline)] pt-4">
            {footer}
          </CardFooter>
        ) : null}
      </Card>
    </article>
  );
}
