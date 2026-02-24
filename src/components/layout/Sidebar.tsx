import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSyncStatus } from "@/hooks/use-sync";
import { useComparisonStore } from "@/stores/comparison-store";
import {
  BookOpen,
  GitCompareArrows,
  Grid3X3,
  Swords,
  Package,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", icon: BookOpen, label: "Pokédex", badge: null as string | null },
  { to: "/compare", icon: GitCompareArrows, label: "Compare", badge: "compare" },
  { to: "/types", icon: Grid3X3, label: "Types", badge: null },
  { to: "/moves", icon: Swords, label: "Moves", badge: null },
  { to: "/items", icon: Package, label: "Items", badge: null },
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

  let color = "bg-muted-foreground/40"; // default / unknown
  let title = "No sync data";

  if (hasError) {
    color = "bg-red-500";
    title = "Sync error";
  } else if (isSyncing) {
    color = "bg-yellow-500 animate-pulse";
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

  // Collapse automatically on narrow viewports
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    setCollapsed(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[52px]" : "w-56"
      )}
    >
      {/* ── Logo ── */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3",
          collapsed && "justify-center px-0"
        )}
      >
        {/* Pokeball-inspired icon */}
        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
          <div className="h-7 w-7 rounded-full border-[2.5px] border-sidebar-primary bg-sidebar-primary/15" />
          <div className="absolute h-[2.5px] w-full bg-sidebar-primary" />
          <div className="absolute h-2.5 w-2.5 rounded-full border-[2px] border-sidebar-primary bg-sidebar" />
        </div>
        {!collapsed && (
          <span className="text-base font-bold tracking-tight text-sidebar-foreground">
            Pokedia
          </span>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => {
          const badgeCount = badge === "compare" ? compareCount : 0;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive
                    ? "bg-sidebar-primary/15 text-sidebar-primary shadow-[inset_3px_0_0_0] shadow-sidebar-primary"
                    : "text-sidebar-foreground/60",
                  collapsed && "justify-center px-0"
                )
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{label}</span>}
              {badgeCount > 0 && (
                <span className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1 text-[10px] font-bold text-sidebar-primary-foreground",
                  collapsed ? "absolute -right-0.5 -top-0.5" : "ml-auto"
                )}>
                  {badgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Bottom section ── */}
      <div className="flex flex-col gap-0.5 border-t border-sidebar-border px-2 py-3">
        {BOTTOM_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-primary/15 text-sidebar-primary shadow-[inset_3px_0_0_0] shadow-sidebar-primary"
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
            "mt-1 flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sidebar-foreground/50 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
