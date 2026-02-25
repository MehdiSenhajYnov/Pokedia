import { useAllGames, useSelectedGame } from "@/hooks/use-games";
import { useSettingsStore } from "@/stores/settings-store";
import { Gamepad2, ChevronDown, X } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";

const dropdownVariants = {
  initial: { opacity: 0, scale: 0.95, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0, transition: springSnappy },
  exit: { opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.12 } },
};

export function GameSelector() {
  const { data: games } = useAllGames();
  const selectedGame = useSelectedGame();
  const { selectedGameId, setSelectedGameId } = useSettingsStore();
  const gameName = useSettingsStore((s) => s.abilityName); // reuse fallback-aware getter (en/fr)
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Update dropdown position from button rect
  const updatePos = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const hackroms = games?.filter((g) => g.is_hackrom === 1) ?? [];
  const officials = games?.filter((g) => g.is_hackrom === 0) ?? [];

  const displayName = selectedGame
    ? gameName(selectedGame.name_en, selectedGame.name_fr)
    : "All games";

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all",
          selectedGameId
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10",
        )}
      >
        <Gamepad2 className="h-3.5 w-3.5" />
        <span className="max-w-[120px] truncate">{displayName}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {/* Clear button */}
      {selectedGameId && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedGameId(null);
          }}
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
          aria-label="Clear game selection"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}

      {/* Dropdown via portal */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={dropdownRef}
              variants={dropdownVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed w-56 rounded-xl border border-border/30 bg-popover/95 backdrop-blur-xl shadow-lg overflow-hidden"
              style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
            >
              {/* All games option */}
              <button
                onClick={() => { setSelectedGameId(null); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors",
                  !selectedGameId
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                All games (base data)
              </button>

              {/* Hackroms section */}
              {hackroms.length > 0 && (
                <>
                  <div className="border-t border-border/20 px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Hackroms
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {hackroms.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => { setSelectedGameId(g.id); setOpen(false); }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors",
                          selectedGameId === g.id
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-white/5",
                        )}
                      >
                        <Gamepad2 className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{gameName(g.name_en, g.name_fr)}</span>
                        {g.version && (
                          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                            v{g.version}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Officials section */}
              {officials.length > 0 && (
                <>
                  <div className="border-t border-border/20 px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Official games
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {officials.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => { setSelectedGameId(g.id); setOpen(false); }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors",
                          selectedGameId === g.id
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-white/5",
                        )}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span className="truncate">{gameName(g.name_en, g.name_fr)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
