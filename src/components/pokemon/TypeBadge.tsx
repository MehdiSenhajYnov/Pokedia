import { cn } from "@/lib/utils";
import { TYPE_COLORS } from "@/lib/constants";

interface TypeBadgeProps {
  type: string | null;
  size?: "sm" | "md";
  className?: string;
}

const FALLBACK = { bg: "bg-gray-500", text: "text-white", border: "border-gray-500" };

export function TypeBadge({ type, size = "sm", className }: TypeBadgeProps) {
  if (!type) return null;

  const colors = TYPE_COLORS[type] ?? FALLBACK;

  return (
    <span
      role="img"
      aria-label={`${type} type`}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium capitalize leading-none",
        colors.bg,
        colors.text,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className,
      )}
    >
      {type}
    </span>
  );
}
