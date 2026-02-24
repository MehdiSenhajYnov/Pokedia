import { STAT_NAMES, STAT_COLORS } from "@/lib/constants";
import { motion } from "framer-motion";
import { springWobbly } from "@/lib/motion";

interface StatsBarProps {
  stats: Record<string, number | null>;
  maxValue?: number;
  showTotal?: boolean;
  relative?: boolean;
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
    <div className="space-y-3">
      {entries.map(([key, rawValue], i) => {
        const value = rawValue ?? 0;
        const max = relative ? (maxInGroup?.[key] ?? maxValue) : maxValue;
        const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
        const color = STAT_COLORS[key] ?? "#888";

        return (
          <div key={key} className="flex items-center gap-3 text-xs">
            <span
              className="w-8 text-right font-heading font-semibold"
              style={{ color }}
            >
              {STAT_NAMES[key] ?? key}
            </span>
            <span className="w-8 text-right font-mono font-medium">
              {rawValue !== null ? value : "\u2014"}
            </span>
            <div
              className="h-3 flex-1 overflow-hidden rounded-full bg-muted/30"
              role="meter"
              aria-label={STAT_NAMES[key] ?? key}
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={max}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${color}, ${color}b3)`,
                  transformOrigin: "left",
                  boxShadow: `0 0 8px ${color}40`,
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: pct / 100 }}
                transition={{ ...springWobbly, delay: i * 0.08 }}
              />
            </div>
          </div>
        );
      })}

      {showTotal && (
        <div className="flex items-center gap-3 border-t border-border pt-1.5 text-xs">
          <span className="w-8 text-right font-heading font-bold text-primary">
            TOT
          </span>
          <span className="w-8 text-right font-mono font-bold text-primary">
            {total}
          </span>
        </div>
      )}
    </div>
  );
}
