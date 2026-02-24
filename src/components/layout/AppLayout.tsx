import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SyncBanner } from "./SyncBanner";
import { TabBar } from "./TabBar";
import { MeshGradientBg } from "./MeshGradientBg";
import { SearchCrossResults } from "./SearchCrossResults";
import { useSyncInvalidation } from "@/hooks/use-sync-invalidation";
import { usePrefetch } from "@/hooks/use-prefetch";
import { useSearchStore } from "@/stores/search-store";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

export function AppLayout() {
  useSyncInvalidation();
  usePrefetch();
  const location = useLocation();
  const { query, searchActive, dismissSearch } = useSearchStore();
  const isBrowserPage = location.pathname === "/" || location.pathname === "/moves" || location.pathname === "/items";
  const showOverlay = !isBrowserPage && searchActive && query.length >= 2;
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
        <main id="main-content" ref={mainRef} className="relative flex-1 overflow-y-auto">
          <ErrorBoundary key={location.pathname}>
            <div key={location.pathname} className="page-enter">
              <Outlet />
            </div>
          </ErrorBoundary>
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
        </main>
      </div>
    </div>
  );
}
