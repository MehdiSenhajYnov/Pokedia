import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SyncBanner } from "./SyncBanner";
import { TabBar } from "./TabBar";
import { MeshGradientBg } from "./MeshGradientBg";
import { SearchCrossResults } from "./SearchCrossResults";
import { useSyncInvalidation } from "@/hooks/use-sync-invalidation";
import { useGameImport } from "@/hooks/use-game-import";
import { usePrefetch } from "@/hooks/use-prefetch";
import { useSearchStore } from "@/stores/search-store";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function AppLayout() {
  useSyncInvalidation();
  useGameImport();
  usePrefetch();
  const location = useLocation();
  const dismissSearch = useSearchStore((s) => s.dismissSearch);
  const isBrowserPage = location.pathname === "/" || location.pathname === "/moves" || location.pathname === "/items";
  const mainRef = useRef<HTMLElement>(null);

  // Dismiss search overlay on any route change
  useEffect(() => {
    dismissSearch();
  }, [location.pathname, dismissSearch]);
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const prevPath = useRef(location.pathname);

  // Continuously save scroll position for the current page
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const handler = () => {
      scrollPositions.current.set(location.pathname, main.scrollTop);
    };
    main.addEventListener("scroll", handler, { passive: true });
    return () => {
      main.removeEventListener("scroll", handler);
    };
  }, [location.pathname]);

  // On route change: save old position, restore or reset for the new page
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    if (prevPath.current !== location.pathname) {
      scrollPositions.current.set(prevPath.current, main.scrollTop);
      prevPath.current = location.pathname;
    }

    const saved = scrollPositions.current.get(location.pathname);
    if (saved != null && saved > 0) {
      requestAnimationFrame(() => main.scrollTo(0, saved));
      return;
    }
    main.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="relative flex h-screen overflow-hidden isolate">
      {/* Living mesh gradient background */}
      <MeshGradientBg />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <SyncBanner />
        <TabBar />
        <div className="relative flex-1 overflow-hidden">
          <main
            id="main-content"
            ref={mainRef}
            className={cn(
              "flex h-full min-h-0 flex-col",
              isBrowserPage ? "overflow-hidden" : "overflow-y-auto",
            )}
          >
            <ErrorBoundary key={location.pathname}>
              <div key={location.pathname} className="flex min-h-0 flex-1 flex-col">
                <Outlet />
              </div>
            </ErrorBoundary>
          </main>
          {!isBrowserPage && <GlobalSearchOverlay />}
        </div>
      </div>
    </div>
  );
}

function GlobalSearchOverlay() {
  const query = useSearchStore((s) => s.query);
  const searchActive = useSearchStore((s) => s.searchActive);
  const dismissSearch = useSearchStore((s) => s.dismissSearch);
  const showOverlay = searchActive && query.length >= 2;

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          className="absolute inset-0 z-20 overflow-y-auto bg-background/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="p-5">
            <SearchCrossResults onNavigate={() => dismissSearch()} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
