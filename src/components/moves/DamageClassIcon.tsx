import { Flame, Sparkles, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const CLASS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: typeof Flame }
> = {
  physical: {
    label: "Physical",
    color: "text-orange-400",
    bgColor: "bg-orange-400/15",
    icon: Flame,
  },
  special: {
    label: "Special",
    color: "text-blue-400",
    bgColor: "bg-blue-400/15",
    icon: Sparkles,
  },
  status: {
    label: "Status",
    color: "text-gray-400",
    bgColor: "bg-gray-400/15",
    icon: Shield,
  },
};

interface DamageClassIconProps {
  damageClass: string | null;
  showLabel?: boolean;
  className?: string;
}

export function DamageClassIcon({
  damageClass,
  showLabel = false,
  className,
}: DamageClassIconProps) {
  if (!damageClass) return <span className="text-xs text-muted-foreground">--</span>;

  const config = CLASS_CONFIG[damageClass];
  if (!config) {
    return (
      <span className="text-xs text-muted-foreground capitalize">
        {damageClass}
      </span>
    );
  }

  const Icon = config.icon;

  return (
    <motion.span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium bg-white/8",
        config.color,
        className,
      )}
      title={config.label}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <Icon className="h-4 w-4" />
      {showLabel && <span>{config.label}</span>}
    </motion.span>
  );
}
