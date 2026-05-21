import { useState, useCallback, type SyntheticEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";

interface PokemonSpriteProps {
  src: string | null;
  alt: string;
  pokemonId?: number | null;
  className?: string;
  fallbackClassName?: string;
  crossFade?: boolean;
}

const GITHUB_SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

interface ImageState {
  sourceKey: string;
  failedSrcs: Set<string>;
  loadedSrc: string | null;
}

export function PokemonSprite({
  src,
  alt,
  pokemonId,
  className,
  fallbackClassName,
  crossFade,
}: PokemonSpriteProps) {
  const fallbackSrc = pokemonId ? `${GITHUB_SPRITE_BASE}/${pokemonId}.png` : null;
  const sourceKey = `${src ?? ""}|${fallbackSrc ?? ""}`;
  const [imageState, setImageState] = useState<ImageState>(() => ({
    sourceKey,
    failedSrcs: new Set(),
    loadedSrc: null,
  }));
  const activeImageState =
    imageState.sourceKey === sourceKey
      ? imageState
      : { sourceKey, failedSrcs: new Set<string>(), loadedSrc: null };

  const primarySrc = src && !activeImageState.failedSrcs.has(src) ? src : null;
  const fallbackDisplaySrc =
    fallbackSrc && !activeImageState.failedSrcs.has(fallbackSrc) ? fallbackSrc : null;
  const currentSrc = primarySrc ?? fallbackDisplaySrc;
  const status: "loading" | "loaded" | "fallback" | "error" =
    !currentSrc
      ? "error"
      : activeImageState.loadedSrc === currentSrc
        ? "loaded"
        : currentSrc === src
          ? "loading"
          : "fallback";

  const handleError = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      const failedSrc = event.currentTarget.getAttribute("src");
      if (!failedSrc) return;

      setImageState((prev) => {
        const failedSrcs = prev.sourceKey === sourceKey ? prev.failedSrcs : new Set<string>();
        if (prev.sourceKey === sourceKey && failedSrcs.has(failedSrc)) return prev;

        const nextFailedSrcs = new Set(failedSrcs);
        nextFailedSrcs.add(failedSrc);
        return {
          sourceKey,
          failedSrcs: nextFailedSrcs,
          loadedSrc: prev.sourceKey === sourceKey ? prev.loadedSrc : null,
        };
      });
    },
    [sourceKey],
  );

  const handleLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      const loadedSrc = event.currentTarget.getAttribute("src");
      if (!loadedSrc) return;

      setImageState((prev) => {
        const failedSrcs = prev.sourceKey === sourceKey ? prev.failedSrcs : new Set<string>();
        if (prev.sourceKey === sourceKey && prev.loadedSrc === loadedSrc) return prev;
        return { sourceKey, failedSrcs, loadedSrc };
      });
    },
    [sourceKey],
  );

  if (status === "error" || !currentSrc) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-white/8 text-muted-foreground",
          className,
          fallbackClassName,
        )}
        role="img"
        aria-label={alt}
      >
        <svg
          viewBox="0 0 100 100"
          className="h-3/5 w-3/5 opacity-30 animate-[float_3s_ease-in-out_infinite]"
          fill="currentColor"
        >
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" />
          <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="4" />
          <circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="50" cy="50" r="6" />
        </svg>
      </div>
    );
  }

  if (crossFade) {
    return (
      <div className={cn("relative", className)}>
        <AnimatePresence mode="wait">
          <motion.img
            key={currentSrc}
            src={currentSrc}
            alt={alt}
            className="h-full w-full object-contain"
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.2 }}
          />
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {(status === "loading" || status === "fallback") && (
        <div className="absolute inset-0 skeleton-shimmer rounded-lg" />
      )}
      <motion.img
        src={currentSrc}
        alt={alt}
        className={cn(
          "h-full w-full object-contain",
          status === "loaded" ? "opacity-100" : "opacity-0",
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        initial={{ opacity: 0, y: 8, scale: 0.9 }}
        animate={status === "loaded" ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={springSnappy}
      />
    </div>
  );
}
