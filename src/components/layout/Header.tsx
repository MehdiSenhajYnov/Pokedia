import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Moon, Sun, Search, X, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingsStore } from "@/stores/settings-store";
import { useSearchStore } from "@/stores/search-store";
import { springSnappy } from "@/lib/motion";
import { GlassNavbar, GlassPill } from "@/components/ui/liquid-glass";
import { GameSelector } from "@/components/layout/GameSelector";

type ActiveCategory = "pokemon" | "moves" | "items" | null;

function getActiveCategory(pathname: string): ActiveCategory {
  if (pathname === "/") return "pokemon";
  if (pathname === "/moves") return "moves";
  if (pathname === "/items") return "items";
  return null;
}

function getPlaceholder(category: ActiveCategory): string {
  switch (category) {
    case "pokemon": return "Search Pokemon...";
    case "moves": return "Search moves...";
    case "items": return "Search items...";
    default: return "Search Pokemon, moves, items...";
  }
}

export function Header({ title }: { title?: string }) {
  const { theme, toggleTheme } = useSettingsStore();
  const { query, setQuery, activateSearch } = useSearchStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDetailPage = /^\/(pokemon|moves|items)\/\d+/.test(pathname);

  const inputRef = useRef<HTMLInputElement>(null);

  const activeCategory = getActiveCategory(pathname);

  // Ctrl+K global shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (query) {
        setQuery("");
      } else {
        inputRef.current?.blur();
      }
    } else if (e.key === "Enter" && query.length >= 2) {
      activateSearch();
    }
  };

  return (
    <GlassNavbar className="shrink-0 border-b border-border/30">
      <header className="flex h-14 items-center gap-4 px-6">
        {/* Left: back chevron + page title */}
        <div className="flex items-center gap-1 shrink-0">
          {isDetailPage && (
            <button
              onClick={() => navigate(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <h1 className="font-heading text-lg font-bold tracking-tight text-foreground text-glass">
            {title || "Pokedia"}
          </h1>
        </div>

        {/* Game selector */}
        <GameSelector />

        {/* Center: search bar */}
        <GlassPill className="flex-1 max-w-lg" style={{ width: "100%" }}>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={getPlaceholder(activeCategory)}
              className="h-10 w-full rounded-full bg-transparent pl-9 pr-20 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              aria-label="Search"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="pointer-events-none hidden rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
                Ctrl+K
              </kbd>
            </div>
          </div>
        </GlassPill>

        {/* Right: theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-white/10 hover:text-foreground"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {theme === "dark" ? (
              <motion.div
                key="sun"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={springSnappy}
              >
                <Sun className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -90 }}
                transition={springSnappy}
              >
                <Moon className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </header>
    </GlassNavbar>
  );
}
