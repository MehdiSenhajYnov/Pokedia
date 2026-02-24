interface MeshGradientBgProps {
  accentColor?: string;
}

export function MeshGradientBg({ accentColor }: MeshGradientBgProps) {
  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
      style={
        accentColor
          ? ({ "--mesh-accent": accentColor } as React.CSSProperties)
          : undefined
      }
    >
      <div className="mesh-blob mesh-blob-1" />
      <div className="mesh-blob mesh-blob-2" />
      <div className="mesh-blob mesh-blob-3" />
    </div>
  );
}
