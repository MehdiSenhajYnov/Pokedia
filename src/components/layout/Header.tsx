import { useState } from "react";
import { Moon, Sun, Search } from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { GlobalSearch } from "./GlobalSearch";

export function Header({ title }: { title?: string }) {
  const { theme, toggleTheme } = useSettingsStore();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background/80 px-5 backdrop-blur-sm">
        {/* Left: page title */}
        <h1 className="text-sm font-semibold tracking-tight text-foreground">
          {title || "Pokedia"}
        </h1>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          {/* Search trigger (command palette style) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-8 items-center gap-2 rounded-lg border border-input bg-background px-3 text-xs text-muted-foreground transition-colors duration-150 hover:border-ring/40 hover:bg-accent hover:text-accent-foreground"
            aria-label="Search (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="pointer-events-none ml-1 hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
              Ctrl+K
            </kbd>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
