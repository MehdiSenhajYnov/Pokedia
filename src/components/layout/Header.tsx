import { startTransition, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Moon, Sun, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingsStore } from "@/stores/settings-store";
import { useSearchStore } from "@/stores/search-store";
import { springSnappy } from "@/lib/motion";
import { GlassNavbar } from "@/components/ui/liquid-glass";
import { GameSelector } from "@/components/layout/GameSelector";

type ActiveCategory = "pokemon" | "moves" | "items" | null;
const SEARCH_DEBOUNCE_MS = 140;

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
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const { pathname } = useLocation();

  const activeCategory = getActiveCategory(pathname);

  return (
    <GlassNavbar className="shrink-0 border-b border-border/30">
      <header className="flex h-14 items-center gap-4 px-6">
        {/* Left: page title */}
        <div className="flex items-center gap-1 shrink-0">
          <h1 className="font-heading text-lg font-bold tracking-tight text-foreground text-glass">
            {title || "Pokedia"}
          </h1>
        </div>

        {/* Game selector */}
        <GameSelector />

        {/* Center: search bar */}
        <SearchBar activeCategory={activeCategory} />

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

function SearchBar({ activeCategory }: { activeCategory: ActiveCategory }) {
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const activateSearch = useSearchStore((s) => s.activateSearch);
  const searchNavIndex = useSearchStore((s) => s.searchNavIndex);
  const searchNavTotal = useSearchStore((s) => s.searchNavTotal);
  const setSearchNavIndex = useSearchStore((s) => s.setSearchNavIndex);
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState(query);

  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    const handle = window.requestAnimationFrame(() => setLocalQuery(query));
    return () => window.cancelAnimationFrame(handle);
  }, [query]);

  useEffect(() => {
    if (localQuery === query) return;

    const handle = window.setTimeout(() => {
      startTransition(() => setQuery(localQuery));
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [localQuery, query, setQuery]);

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
    const hasSearch = localQuery.trim().length >= 2;

    if (e.key === "Escape") {
      e.preventDefault();
      if (localQuery) {
        setLocalQuery("");
        setQuery("");
      } else {
        inputRef.current?.blur();
      }
    } else if (e.key === "ArrowDown" && hasSearch) {
      e.preventDefault();
      if (searchNavTotal > 0) {
        setSearchNavIndex((searchNavIndex + 1) % searchNavTotal);
      }
    } else if (e.key === "ArrowUp" && hasSearch) {
      e.preventDefault();
      if (searchNavTotal > 0) {
        setSearchNavIndex((searchNavIndex - 1 + searchNavTotal) % searchNavTotal);
      }
    } else if (e.key === "Enter" && hasSearch) {
      if (searchNavIndex >= 0) {
        e.preventDefault();
        const el = document.querySelector(`[data-search-idx="${searchNavIndex}"]`) as HTMLElement;
        el?.click();
      } else {
        if (localQuery !== query) {
          setQuery(localQuery);
        }
        activateSearch();
      }
    }
  };

  return (
    <div
      className="flex-1 max-w-lg rounded-full border border-border/30 glass-light-flat glass-edge"
      style={{ width: "100%" }}
    >
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={getPlaceholder(activeCategory)}
          className="h-10 w-full rounded-full bg-transparent pl-9 pr-20 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          aria-label="Search"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {localQuery && (
            <button
              onClick={() => {
                setLocalQuery("");
                setQuery("");
              }}
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
    </div>
  );
}
