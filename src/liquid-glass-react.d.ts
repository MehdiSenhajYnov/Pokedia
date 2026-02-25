declare module "@tinymomentum/liquid-glass-react" {
  import type { ComponentPropsWithRef, ReactNode } from "react";

  interface LiquidGlassProps {
    noiseStrength?: number;
    noiseFrequency?: number;
    frostBlurRadius?: number;
    glassTintOpacity?: number;
    glassTintColor?: string;
    innerShadowColor?: string;
    innerShadowBlur?: number;
    innerShadowSpread?: number;
    width?: number;
    height?: number;
    borderRadius?: number;
  }

  export interface LiquidGlassContainerProps
    extends ComponentPropsWithRef<"div">,
      LiquidGlassProps {
    children?: ReactNode;
  }

  export interface LiquidGlassButtonProps
    extends ComponentPropsWithRef<"button">,
      LiquidGlassProps {
    children?: ReactNode;
  }

  export function LiquidGlassContainer(props: LiquidGlassContainerProps): JSX.Element;
  export function LiquidGlassButton(props: LiquidGlassButtonProps): JSX.Element;
}
