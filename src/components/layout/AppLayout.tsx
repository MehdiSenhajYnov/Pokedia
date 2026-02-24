import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SyncBanner } from "./SyncBanner";
import { useSyncInvalidation } from "@/hooks/use-sync-invalidation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

export function AppLayout() {
  useSyncInvalidation();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top on route change
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Skip to content for accessibility */}
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
        <main id="main-content" ref={mainRef} className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
