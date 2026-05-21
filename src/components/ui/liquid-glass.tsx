import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

type GlassPreset = {
  borderRadiusPx: number;
  className: string;
};

export const LIQUID_GLASS_PRESETS = {
  card: {
    borderRadiusPx: 20,
    className: "glass-flat glass-edge shadow-glass",
  },
  sidebar: {
    borderRadiusPx: 0,
    className: "glass-light-flat glass-edge",
  },
  button: {
    borderRadiusPx: 30,
    className: "glass-light-flat glass-edge",
  },
  modal: {
    borderRadiusPx: 24,
    className: "glass-flat glass-edge shadow-glass",
  },
  navbar: {
    borderRadiusPx: 0,
    className: "glass-light-flat glass-edge",
  },
  toolbar: {
    borderRadiusPx: 16,
    className: "glass-light-flat glass-edge",
  },
  pill: {
    borderRadiusPx: 24,
    className: "glass-light-flat glass-edge",
  },
  subtle: {
    borderRadiusPx: 12,
    className: "glass-light-flat glass-edge",
  },
} as const satisfies Record<string, GlassPreset>;

interface GlassComponentProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: React.MouseEventHandler;
}

interface GlassBaseProps extends GlassComponentProps {
  preset: GlassPreset;
}

function GlassBase({ preset, children, className, style, onClick }: GlassBaseProps) {
  return (
    <div
      className={cn("static-glass", preset.className, className)}
      style={{
        width: "100%",
        height: "auto",
        borderRadius: `${preset.borderRadiusPx}px`,
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function GlassCard({ children, className, style, onClick }: GlassComponentProps) {
  return (
    <GlassBase preset={LIQUID_GLASS_PRESETS.card} className={className} style={style} onClick={onClick}>
      {children}
    </GlassBase>
  );
}

export function GlassPanel({ children, className, style, onClick }: GlassComponentProps) {
  return (
    <GlassBase preset={LIQUID_GLASS_PRESETS.card} className={className} style={style} onClick={onClick}>
      {children}
    </GlassBase>
  );
}

export function GlassSidebar({ children, className, style }: Omit<GlassComponentProps, "onClick">) {
  return (
    <GlassBase
      preset={LIQUID_GLASS_PRESETS.sidebar}
      className={className}
      style={{ height: "100%", ...style }}
    >
      {children}
    </GlassBase>
  );
}

export function GlassNavbar({ children, className, style }: Omit<GlassComponentProps, "onClick">) {
  return (
    <GlassBase preset={LIQUID_GLASS_PRESETS.navbar} className={className} style={style}>
      {children}
    </GlassBase>
  );
}

export function GlassToolbar({ children, className, style }: Omit<GlassComponentProps, "onClick">) {
  return (
    <GlassBase preset={LIQUID_GLASS_PRESETS.toolbar} className={className} style={style}>
      {children}
    </GlassBase>
  );
}

export function GlassPill({ children, className, style, onClick }: GlassComponentProps) {
  return (
    <GlassBase preset={LIQUID_GLASS_PRESETS.pill} className={className} style={style} onClick={onClick}>
      {children}
    </GlassBase>
  );
}

export function GlassModal({ children, className, style }: Omit<GlassComponentProps, "onClick">) {
  return (
    <GlassBase preset={LIQUID_GLASS_PRESETS.modal} className={className} style={style}>
      {children}
    </GlassBase>
  );
}

export function GlassSubtle({ children, className, style, onClick }: GlassComponentProps) {
  return (
    <GlassBase preset={LIQUID_GLASS_PRESETS.subtle} className={className} style={style} onClick={onClick}>
      {children}
    </GlassBase>
  );
}

interface GlassButtonProps extends GlassComponentProps {
  disabled?: boolean;
}

export function GlassButton({ children, className, style, onClick, disabled }: GlassButtonProps) {
  const preset = LIQUID_GLASS_PRESETS.button;

  return (
    <button
      type="button"
      className={cn("static-glass inline-flex items-center justify-center", preset.className, className)}
      style={{
        borderRadius: `${preset.borderRadiusPx}px`,
        ...style,
      }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
    >
      {children}
    </button>
  );
}
