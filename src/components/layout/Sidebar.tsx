import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSyncStatus } from "@/hooks/use-sync";
import { useComparisonStore } from "@/stores/comparison-store";
import { navItemVariants, springSnappy } from "@/lib/motion";
import { GlassSidebar } from "@/components/ui/liquid-glass";
import {
  BookOpen,
  GitCompareArrows,
  Grid3X3,
  Swords,
  Sparkles,
  Package,
  Leaf,
  Settings,
  ChevronLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  badge: string | null;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Encyclopedia",
    items: [
      { to: "/", icon: BookOpen, label: "Pokédex", badge: null },
      { to: "/moves", icon: Swords, label: "Moves", badge: null },
      { to: "/abilities", icon: Sparkles, label: "Abilities", badge: null },
      { to: "/items", icon: Package, label: "Items", badge: null },
      { to: "/natures", icon: Leaf, label: "Natures", badge: null },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/types", icon: Grid3X3, label: "Types", badge: null },
      { to: "/compare", icon: GitCompareArrows, label: "Compare", badge: "compare" },
    ],
  },
];

const BOTTOM_ITEMS = [
  { to: "/settings", icon: Settings, label: "Settings" },
];

function SyncDot() {
  const { data: syncStatus } = useSyncStatus();

  const hasError = syncStatus?.resources.some((r) => r.status === "error");
  const isSyncing = syncStatus?.is_syncing;
  const allDone =
    syncStatus &&
    syncStatus.resources.length > 0 &&
    syncStatus.resources.every((r) => r.status === "done");

  let color = "bg-muted-foreground/40";
  let title = "No sync data";

  if (hasError) {
    color = "bg-red-500";
    title = "Sync error";
  } else if (isSyncing) {
    color = "bg-yellow-500 animate-[glow-pulse_2s_ease-in-out_infinite]";
    title = "Syncing...";
  } else if (allDone) {
    color = "bg-emerald-500";
    title = "Data synced";
  }

  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", color)}
      title={title}
    />
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const compareCount = useComparisonStore((s) => s.pokemonIds.length);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    setCollapsed(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <motion.aside
      aria-label="Main navigation"
      className={cn(
        "flex h-screen flex-col border-r border-border/30",
        collapsed ? "rounded-r-2xl" : ""
      )}
      animate={{ width: collapsed ? 52 : 224 }}
      transition={springSnappy}
    >
    <GlassSidebar className="flex-1" style={{ borderRadius: collapsed ? "0 1rem 1rem 0" : "0" }}>
      {/* ── Logo ── */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2.5 border-b border-border/30 px-3",
          collapsed && "justify-center px-0"
        )}
      >
        <motion.div
          className="relative flex h-7 w-7 shrink-0 items-center justify-center cursor-pointer"
          whileHover={{ rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <div className="h-7 w-7 rounded-full border-[2.5px] border-primary bg-primary/15" />
          <div className="absolute h-[2.5px] w-full bg-primary" />
          <div className="absolute h-2.5 w-2.5 rounded-full border-[2px] border-primary bg-sidebar" />
        </motion.div>
        {!collapsed && (
          <span className="font-heading text-base font-bold tracking-tight text-sidebar-foreground">
            Pokedia
          </span>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
        {NAV_SECTIONS.map((section, sectionIdx) => (
          <div key={section.label}>
            {/* Section separator */}
            {sectionIdx > 0 && (
              collapsed ? (
                <div className="my-2 border-t border-border/30" />
              ) : (
                <div className="mt-3 mb-1.5 px-3">
                  <span className="text-[10px] uppercase tracking-wide font-heading font-medium text-sidebar-foreground/40">
                    {section.label}
                  </span>
                </div>
              )
            )}
            {/* First section header (only when expanded) */}
            {sectionIdx === 0 && !collapsed && (
              <div className="mb-1.5 px-3">
                <span className="text-[10px] uppercase tracking-wide font-heading font-medium text-sidebar-foreground/40">
                  {section.label}
                </span>
              </div>
            )}
            {section.items.map(({ to, icon: Icon, label, badge }) => {
              const badgeCount = badge === "compare" ? compareCount : 0;
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive
                        ? "text-primary"
                        : "text-sidebar-foreground/60",
                      collapsed && "justify-center px-0"
                    )
                  }
                  title={collapsed ? label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary"
                          transition={springSnappy}
                          style={{
                            marginLeft: collapsed ? -1 : -4,
                            boxShadow: "0 0 10px var(--color-primary), 0 0 20px var(--color-primary)",
                          }}
                        />
                      )}
                      <motion.div
                        className="flex items-center gap-2.5"
                        variants={navItemVariants}
                        initial="rest"
                        whileHover="hover"
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span>{label}</span>}
                      </motion.div>
                      {badgeCount > 0 && (
                        <span className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground",
                          collapsed ? "absolute -right-0.5 -top-0.5" : "ml-auto"
                        )}>
                          {badgeCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Bottom section ── */}
      <div className="flex flex-col gap-1 border-t border-border/30 px-2 py-3">
        {BOTTOM_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "group flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "text-primary"
                  : "text-sidebar-foreground/60",
                collapsed && "justify-center px-0"
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {/* Sync status + collapse toggle */}
        <div
          className={cn(
            "mt-1 flex items-center gap-2.5 px-2.5",
            collapsed ? "justify-center px-0" : "justify-between"
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 text-xs text-sidebar-foreground/50">
              <SyncDot />
              <span>Sync</span>
            </div>
          )}
          {collapsed && <SyncDot />}
        </div>

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "mt-1 flex h-8 items-center justify-center rounded-full text-sidebar-foreground/50 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "mx-auto w-8" : "w-8 ml-auto"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={springSnappy}
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </motion.div>
        </button>
      </div>
    </GlassSidebar>
    </motion.aside>
  );
}
