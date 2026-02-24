import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";

interface PokemonSpriteProps {
  src: string | null;
  alt: string;
  pokemonId?: number | null;
  className?: string;
  fallbackClassName?: string;
}

const GITHUB_SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export function PokemonSprite({
  src,
  alt,
  pokemonId,
  className,
  fallbackClassName,
}: PokemonSpriteProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "fallback" | "error">(
    src ? "loading" : pokemonId ? "fallback" : "error",
  );
  const [currentSrc, setCurrentSrc] = useState(
    src ?? (pokemonId ? `${GITHUB_SPRITE_BASE}/${pokemonId}.png` : null),
  );

  const prevSrc = useRef(src);
  useEffect(() => {
    if (src !== prevSrc.current) {
      prevSrc.current = src;
      if (src) {
        setCurrentSrc(src);
        setStatus("loading");
      } else if (pokemonId) {
        setCurrentSrc(`${GITHUB_SPRITE_BASE}/${pokemonId}.png`);
        setStatus("fallback");
      } else {
        setCurrentSrc(null);
        setStatus("error");
      }
    }
  }, [src, pokemonId]);

  const handleError = useCallback(() => {
    if (status === "loading" && pokemonId) {
      setCurrentSrc(`${GITHUB_SPRITE_BASE}/${pokemonId}.png`);
      setStatus("fallback");
    } else {
      setStatus("error");
    }
  }, [status, pokemonId]);

  const handleLoad = useCallback(() => {
    setStatus("loaded");
  }, []);

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
