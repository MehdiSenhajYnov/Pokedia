// Backwards-compatible wrapper — delegates to the new GlassCard
import { GlassCard } from "./liquid-glass";

interface LiquidGlassBoxProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  cornerRadius?: number;
  onClick?: () => void;
}

export function LiquidGlassBox({
  children,
  className,
  style,
  cornerRadius = 16,
  onClick,
}: LiquidGlassBoxProps) {
  return (
    <GlassCard
      className={className}
      style={{ borderRadius: `${cornerRadius}px`, ...style }}
      onClick={onClick}
    >
      {children}
    </GlassCard>
  );
}
