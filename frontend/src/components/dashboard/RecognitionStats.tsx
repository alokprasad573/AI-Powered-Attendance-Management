import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface RecognitionStatItem {
  label: string;
  value: string | number;
  detail?: string;
  accent?: "platinum" | "silver" | "gold" | "present";
}

interface RecognitionStatsProps {
  items: readonly RecognitionStatItem[];
  systemLabel?: string;
}

const ACCENT_TEXT: Record<NonNullable<RecognitionStatItem["accent"]>, string> = {
  platinum: "text-[var(--accent-primary)]",
  silver: "text-[var(--accent-secondary)]",
  gold: "text-[var(--accent-highlight)]",
  present: "text-[#76C4A4]",
};

const ACCENT_LINE: Record<NonNullable<RecognitionStatItem["accent"]>, string> = {
  platinum: "via-[#B9D0D8]/45",
  silver: "via-[#91AAB4]/45",
  gold: "via-[#CDBF9D]/45",
  present: "via-[#76C4A4]/45",
};

/**
 * Swiss-minimal recognition and system telemetry bar backed exclusively
 * by verified database/runtime counts (zero mock or simulated metrics).
 */
export function RecognitionStats({ items }: RecognitionStatsProps) {
  return (
    <section aria-label="Recognition telemetry summary" className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const accent = item.accent ?? "platinum";
          return (
            <Card key={item.label} className="relative overflow-hidden">
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent ${ACCENT_LINE[accent]} to-transparent`}
              />
              <CardHeader className="pb-5">
                <CardDescription>{item.label}</CardDescription>
                <CardTitle
                  className={`metric-value pt-1 text-3xl font-semibold ${ACCENT_TEXT[accent]}`}
                >
                  {item.value}
                </CardTitle>
                {item.detail ? (
                  <p className="pt-1 text-xs text-[var(--text-secondary)]">
                    {item.detail}
                  </p>
                ) : null}
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
