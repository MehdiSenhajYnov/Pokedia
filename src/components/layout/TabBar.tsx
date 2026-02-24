import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, Swords, Package, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { useTabStore, type Tab } from "@/stores/tab-store";
import { useSettingsStore } from "@/stores/settings-store";
import { TYPE_COLORS_HEX } from "@/lib/constants";
import { tabBarVariants, tabPillVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function TabBar() {
  const { tabs, activeTabId, setActive, closeTab, closeOthers, closeAll } =
    useTabStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { pokemonName, moveName, itemName, abilityName } = useSettingsStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Derive visual active state from the current route
  const visualActiveId = (() => {
    const m = pathname.match(/^\/(pokemon|moves|items|abilities)\/(\d+)$/);
    if (m) {
      const kind = m[1] === "moves" ? "move" : m[1] === "items" ? "item" : m[1] === "abilities" ? "ability" : "pokemon";
      return `${kind}-${m[2]}`;
    }
    return null;
  })();

  const navigateToTab = useCallback(
    (tab: Tab) => {
      setActive(tab.id);
      if (tab.kind === "pokemon") navigate(`/pokemon/${tab.entityId}`);
      else if (tab.kind === "move") navigate(`/moves/${tab.entityId}`);
      else if (tab.kind === "ability") navigate(`/abilities/${tab.entityId}`);
      else navigate(`/items/${tab.entityId}`);
    },
    [navigate, setActive],
  );

  const handleTabClick = useCallback(
    (tab: Tab) => {
      navigateToTab(tab);
    },
    [navigateToTab],
  );

  const categoryHome = useCallback((tab: Tab) => {
    if (tab.kind === "pokemon") return "/";
    if (tab.kind === "move") return "/moves";
    if (tab.kind === "ability") return "/abilities";
    return "/items";
  }, []);

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (tabId === visualActiveId) {
        const idx = tabs.findIndex((t) => t.id === tabId);
        const remaining = tabs.filter((t) => t.id !== tabId);
        if (remaining.length > 0) {
          const neighborIdx = Math.min(idx, remaining.length - 1);
          navigateToTab(remaining[neighborIdx]);
        } else {
          const tab = tabs.find((t) => t.id === tabId);
          navigate(tab ? categoryHome(tab) : "/");
        }
      }
      closeTab(tabId);
    },
    [tabs, visualActiveId, closeTab, navigateToTab, navigate, categoryHome],
  );

  const handleCloseOthers = useCallback(
    (tabId: string) => {
      if (visualActiveId && visualActiveId !== tabId) {
        const kept = tabs.find((t) => t.id === tabId);
        if (kept) navigateToTab(kept);
      }
      closeOthers(tabId);
    },
    [tabs, visualActiveId, closeOthers, navigateToTab],
  );

  const handleCloseAll = useCallback(
    () => {
      if (visualActiveId) {
        const tab = tabs.find((t) => t.id === visualActiveId);
        navigate(tab ? categoryHome(tab) : "/");
      }
      closeAll();
    },
    [tabs, visualActiveId, closeAll, navigate, categoryHome],
  );

  const handleMiddleClick = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      if (e.button === 1) {
        e.preventDefault();
        handleCloseTab(tabId);
      }
    },
    [handleCloseTab],
  );

  // Ctrl+Tab / Ctrl+Shift+Tab cycling
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.key !== "Tab" || tabs.length === 0) return;
      e.preventDefault();
      const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
      const dir = e.shiftKey ? -1 : 1;
      const nextIdx = (currentIdx + dir + tabs.length) % tabs.length;
      navigateToTab(tabs[nextIdx]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tabs, activeTabId, navigateToTab]);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!scrollRef.current || !activeTabId) return;
    const active = scrollRef.current.querySelector(
      `[data-tab-id="${activeTabId}"]`,
    );
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeTabId]);

  if (tabs.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        variants={tabBarVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="shrink-0 border-b border-border/20 bg-background/80 backdrop-blur-sm"
      >
        <div
          ref={scrollRef}
          className="flex items-center gap-1 overflow-x-auto px-3 py-1.5 scrollbar-hide"
        >
          <AnimatePresence>
            {tabs.map((tab) => {
              const isActive = tab.id === visualActiveId;
              const accentHex =
                tab.typeKey ? TYPE_COLORS_HEX[tab.typeKey] : null;
              const label =
                tab.kind === "pokemon"
                  ? pokemonName(tab.nameEn, tab.nameFr)
                  : tab.kind === "move"
                    ? moveName(tab.nameEn, tab.nameFr)
                    : tab.kind === "ability"
                      ? abilityName(tab.nameEn, tab.nameFr)
                      : itemName(tab.nameEn, tab.nameFr);

              return (
                <ContextMenu.Root key={tab.id}>
                  <ContextMenu.Trigger asChild>
                    <motion.button
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.5 }}
                      data-tab-id={tab.id}
                      variants={tabPillVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      onClick={() => handleTabClick(tab)}
                      onMouseDown={(e) => handleMiddleClick(e, tab.id)}
                      className={cn(
                        "group relative flex h-7 max-w-[160px] shrink-0 items-center gap-1.5 rounded-lg border px-2 text-xs transition-all select-none",
                        isActive
                          ? "bg-white/10 border-white/15 text-foreground shadow-sm"
                          : "border-transparent text-muted-foreground hover:bg-white/8 hover:text-foreground",
                      )}
                      style={
                        isActive && accentHex
                          ? {
                              boxShadow: `0 0 8px ${accentHex}20, inset 0 0 4px ${accentHex}10`,
                            }
                          : undefined
                      }
                    >
                      {/* Accent bar */}
                      {accentHex && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-[3px] rounded-full"
                          style={{ backgroundColor: accentHex }}
                        />
                      )}

                      {/* Icon */}
                      <span className="shrink-0 pl-1">
                        {tab.kind === "pokemon" && tab.spriteUrl ? (
                          <img
                            src={tab.spriteUrl}
                            alt=""
                            className="h-4 w-4 object-contain"
                            loading="lazy"
                          />
                        ) : tab.kind === "move" ? (
                          <Swords className="h-3 w-3" />
                        ) : tab.kind === "ability" ? (
                          <Sparkles className="h-3 w-3" />
                        ) : (
                          <Package className="h-3 w-3" />
                        )}
                      </span>

                      {/* Label */}
                      <span className="truncate">{label}</span>

                      {/* Close button */}
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseTab(tab.id);
                        }}
                        className="ml-auto shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-opacity"
                        aria-label="Close tab"
                      >
                        <X className="h-2.5 w-2.5" />
                      </span>
                    </motion.button>
                  </ContextMenu.Trigger>

                  <ContextMenu.Portal>
                    <ContextMenu.Content className="z-50 min-w-[140px] overflow-hidden rounded-xl bg-background/80 backdrop-blur-xl border border-white/10 p-1 shadow-xl text-sm">
                      <ContextMenu.Item
                        className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs outline-none hover:bg-white/10 focus:bg-white/10 transition-colors"
                        onSelect={() => handleCloseTab(tab.id)}
                      >
                        Close
                      </ContextMenu.Item>
                      <ContextMenu.Item
                        className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs outline-none hover:bg-white/10 focus:bg-white/10 transition-colors"
                        onSelect={() => handleCloseOthers(tab.id)}
                      >
                        Close others
                      </ContextMenu.Item>
                      <ContextMenu.Separator className="my-1 h-px bg-white/10" />
                      <ContextMenu.Item
                        className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs text-destructive outline-none hover:bg-destructive/10 focus:bg-destructive/10 transition-colors"
                        onSelect={() => handleCloseAll()}
                      >
                        Close all
                      </ContextMenu.Item>
                    </ContextMenu.Content>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
