import { cn } from "@/lib/utils";
import { TYPE_COLORS } from "@/lib/constants";
import { motion } from "framer-motion";

interface TypeBadgeProps {
  type: string | null;
  size?: "sm" | "md";
  className?: string;
}

const FALLBACK = { bg: "bg-gray-500", text: "text-white", hex: "#888", glow: "rgba(136,136,136,0.3)" };

export function TypeBadge({ type, size = "sm", className }: TypeBadgeProps) {
  if (!type) return null;

  const colors = TYPE_COLORS[type] ?? FALLBACK;
  const baseShadow = `inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1), 0 2px 10px ${colors.hex}40`;
  const hoverShadow = `inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1), 0 4px 20px ${colors.hex}60`;

  return (
    <motion.span
      role="img"
      aria-label={`${type} type`}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-heading font-medium uppercase leading-none",
        colors.bg,
        colors.text,
        size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
        className,
      )}
      style={{
        boxShadow: baseShadow,
      }}
      whileHover={{
        scale: 1.1,
        boxShadow: hoverShadow,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {type}
    </motion.span>
  );
}
