import { cn } from "@/lib/utils";
import { STAT_NAMES, STAT_COLORS } from "@/lib/constants";
import { motion } from "framer-motion";

interface StatsBarProps {
  /** Record of stat key -> value (nullable values rendered as 0 / dash). */
  stats: Record<string, number | null>;
  /** Absolute max for bar scaling (default 255). */
  maxValue?: number;
  /** Whether to display the stat total row. */
  showTotal?: boolean;
  /** When true, bars scale relative to `maxInGroup` instead of `maxValue`. */
  relative?: boolean;
  /** Per-stat max when running in relative mode (e.g. from a comparison group). */
  maxInGroup?: Record<string, number>;
}

export function StatsBar({
  stats,
  maxValue = 255,
  showTotal = true,
  relative = false,
  maxInGroup,
}: StatsBarProps) {
  const entries = Object.entries(stats);

  const total = entries.reduce((sum, [, v]) => sum + (v ?? 0), 0);

  return (
    <div className="space-y-1.5">
      {entries.map(([key, rawValue]) => {
        const value = rawValue ?? 0;
        const max = relative ? (maxInGroup?.[key] ?? maxValue) : maxValue;
        const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
        const color = STAT_COLORS[key] ?? "#888";

        return (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="w-8 text-right font-medium text-muted-foreground">
              {STAT_NAMES[key] ?? key}
            </span>
            <span className="w-8 text-right font-mono">
              {rawValue !== null ? value : "\u2014"}
            </span>
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
              role="meter"
              aria-label={STAT_NAMES[key] ?? key}
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={max}
            >
              <motion.div
                className={cn("h-full rounded-full")}
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}

      {showTotal && (
        <div className="flex items-center gap-2 border-t border-border pt-1 text-xs">
          <span className="w-8 text-right font-semibold text-muted-foreground">
            TOT
          </span>
          <span className="w-8 text-right font-mono font-semibold">
            {total}
          </span>
        </div>
      )}
    </div>
  );
}
