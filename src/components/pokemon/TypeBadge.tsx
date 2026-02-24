import { cn } from "@/lib/utils";
import { TYPE_COLORS } from "@/lib/constants";

interface TypeBadgeProps {
  type: string | null;
  size?: "sm" | "md";
  className?: string;
}

const FALLBACK = { bg: "bg-gray-500", text: "text-white", hex: "#888", glow: "rgba(136,136,136,0.3)" };

export function TypeBadge({ type, size = "sm", className }: TypeBadgeProps) {
  if (!type) return null;

  const colors = TYPE_COLORS[type] ?? FALLBACK;

  return (
    <span
      role="img"
      aria-label={`${type} type`}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-heading font-medium uppercase leading-none",
        colors.bg,
        colors.text,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className,
      )}
      style={{
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1), 0 2px 10px ${colors.hex}40`,
      }}
    >
      {type}
    </span>
  );
}
