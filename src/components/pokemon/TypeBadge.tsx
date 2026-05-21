import { cn } from "@/lib/utils";
import { TYPE_COLORS } from "@/lib/constants";
import { memo, type CSSProperties } from "react";

interface TypeBadgeProps {
  type: string | null;
  size?: "sm" | "md";
  className?: string;
}

const FALLBACK = { bg: "bg-gray-500", text: "text-white", hex: "#888", glow: "rgba(136,136,136,0.3)" };

export const TypeBadge = memo(function TypeBadge({ type, size = "sm", className }: TypeBadgeProps) {
  if (!type) return null;

  const colors = TYPE_COLORS[type] ?? FALLBACK;
  const baseShadow = `inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1), 0 2px 10px ${colors.hex}40`;
  const hoverShadow = `inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1), 0 4px 20px ${colors.hex}60`;

  return (
    <span
      role="img"
      aria-label={`${type} type`}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-heading font-medium uppercase leading-none transition-[transform,box-shadow] duration-150 hover:scale-[1.06] hover:shadow-[var(--type-hover-shadow)]",
        colors.bg,
        colors.text,
        size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
        className,
      )}
      style={{
        boxShadow: baseShadow,
        "--type-hover-shadow": hoverShadow,
      } as CSSProperties}
    >
      {type}
    </span>
  );
});
