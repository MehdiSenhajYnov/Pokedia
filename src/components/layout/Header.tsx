import { useState } from "react";
import { Moon, Sun, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingsStore } from "@/stores/settings-store";

import { GlobalSearch } from "./GlobalSearch";
import { springSnappy } from "@/lib/motion";

export function Header({ title }: { title?: string }) {
  const { theme, toggleTheme } = useSettingsStore();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between glass-subtle px-6">
        {/* Left: page title */}
        <h1 className="font-heading text-lg font-bold tracking-tight text-foreground">
          {title || "Pokedia"}
        </h1>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Search trigger (pill style) */}
          <motion.button
            onClick={() => setSearchOpen(true)}
            className="flex h-8 items-center gap-2 rounded-full glass border border-border/40 px-4 text-xs text-muted-foreground transition-all duration-150 hover:border-primary/30 hover:shadow-warm"
            aria-label="Search (Ctrl+K)"
            whileHover={{ scale: 1.03 }}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="pointer-events-none ml-1 hidden rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
              Ctrl+K
            </kbd>
          </motion.button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground"
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
        </div>
      </header>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
