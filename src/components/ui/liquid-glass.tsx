import { LiquidGlassContainer, LiquidGlassButton } from "@tinymomentum/liquid-glass-react";
import type { LiquidGlassContainerProps } from "@tinymomentum/liquid-glass-react";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";
import type { ReactNode, CSSProperties } from "react";

// ---------------------------------------------------------------------------
// Presets — iOS 26 liquid glass with visible refraction
// ---------------------------------------------------------------------------

type GlassPreset = Pick<
  LiquidGlassContainerProps,
  | "noiseStrength"
  | "noiseFrequency"
  | "frostBlurRadius"
  | "glassTintOpacity"
  | "innerShadowBlur"
  | "innerShadowSpread"
>;

interface PresetDef extends GlassPreset {
  borderRadiusPx: number;
}

export const LIQUID_GLASS_PRESETS = {
  card: {
    borderRadiusPx: 20,
    noiseStrength: 40,
    noiseFrequency: 0.007,
    frostBlurRadius: 8,
    glassTintOpacity: 2,
    innerShadowBlur: 10,
    innerShadowSpread: -3,
  },
  sidebar: {
    borderRadiusPx: 0,
    noiseStrength: 28,
    noiseFrequency: 0.006,
    frostBlurRadius: 12,
    glassTintOpacity: 3,
    innerShadowBlur: 8,
    innerShadowSpread: -2,
  },
  button: {
    borderRadiusPx: 30,
    noiseStrength: 35,
    noiseFrequency: 0.008,
    frostBlurRadius: 6,
    glassTintOpacity: 4,
    innerShadowBlur: 10,
    innerShadowSpread: -2,
  },
  modal: {
    borderRadiusPx: 24,
    noiseStrength: 36,
    noiseFrequency: 0.007,
    frostBlurRadius: 14,
    glassTintOpacity: 3,
    innerShadowBlur: 12,
    innerShadowSpread: -3,
  },
  navbar: {
    borderRadiusPx: 0,
    noiseStrength: 24,
    noiseFrequency: 0.006,
    frostBlurRadius: 10,
    glassTintOpacity: 2,
    innerShadowBlur: 6,
    innerShadowSpread: -2,
  },
  toolbar: {
    borderRadiusPx: 16,
    noiseStrength: 32,
    noiseFrequency: 0.007,
    frostBlurRadius: 8,
    glassTintOpacity: 2,
    innerShadowBlur: 8,
    innerShadowSpread: -2,
  },
  pill: {
    borderRadiusPx: 24,
    noiseStrength: 30,
    noiseFrequency: 0.008,
    frostBlurRadius: 6,
    glassTintOpacity: 2,
    innerShadowBlur: 6,
    innerShadowSpread: -1,
  },
  subtle: {
    borderRadiusPx: 12,
    noiseStrength: 25,
    noiseFrequency: 0.007,
    frostBlurRadius: 6,
    glassTintOpacity: 1,
    innerShadowBlur: 6,
    innerShadowSpread: -1,
  },
} as const satisfies Record<string, PresetDef>;

// ---------------------------------------------------------------------------
// Theme-aware defaults
// ---------------------------------------------------------------------------

function useGlassTheme() {
  const theme = useSettingsStore((s) => s.theme);
  if (theme === "light") {
    return {
      glassTintColor: "#000000",
      innerShadowColor: "rgba(255, 255, 255, 0.35)",
    };
  }
  return {
    glassTintColor: "#ffffff",
    innerShadowColor: "rgba(255, 255, 255, 0.18)",
  };
}

// ---------------------------------------------------------------------------
// Base responsive wrapper
// ---------------------------------------------------------------------------

interface GlassBaseProps {
  preset: PresetDef;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: React.MouseEventHandler;
}

function GlassBase({ preset, children, className, style, onClick }: GlassBaseProps) {
  const themeDefaults = useGlassTheme();
  const { borderRadiusPx, ...glassProps } = preset;

  return (
    <LiquidGlassContainer
      {...glassProps}
      glassTintColor={themeDefaults.glassTintColor}
      innerShadowColor={themeDefaults.innerShadowColor}
      width={2000}
      height={2000}
      borderRadius={1}
      className={cn("lg-responsive", className)}
      style={{
        width: "100%",
        height: "auto",
        borderRadius: `${borderRadiusPx}px`,
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </LiquidGlassContainer>
  );
}

// ---------------------------------------------------------------------------
// Pre-configured components
// ---------------------------------------------------------------------------

interface GlassComponentProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: React.MouseEventHandler;
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
      className={cn("lg-full-height", className)}
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

// ---------------------------------------------------------------------------
// Glass Button (uses LiquidGlassButton for interactivity)
// ---------------------------------------------------------------------------

interface GlassButtonProps extends GlassComponentProps {
  disabled?: boolean;
}

export function GlassButton({ children, className, style, onClick, disabled }: GlassButtonProps) {
  const themeDefaults = useGlassTheme();
  const preset = LIQUID_GLASS_PRESETS.button;

  return (
    <LiquidGlassButton
      noiseStrength={preset.noiseStrength}
      noiseFrequency={preset.noiseFrequency}
      frostBlurRadius={preset.frostBlurRadius}
      glassTintOpacity={preset.glassTintOpacity}
      glassTintColor={themeDefaults.glassTintColor}
      innerShadowColor={themeDefaults.innerShadowColor}
      innerShadowBlur={preset.innerShadowBlur}
      innerShadowSpread={preset.innerShadowSpread}
      width={400}
      height={100}
      borderRadius={1}
      className={cn("lg-responsive lg-button", className)}
      style={{
        width: "auto",
        height: "auto",
        borderRadius: `${preset.borderRadiusPx}px`,
        ...style,
      }}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
    >
      {children}
    </LiquidGlassButton>
  );
}
