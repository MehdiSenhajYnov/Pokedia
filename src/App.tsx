import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";

const PokemonBrowserPage = lazy(() => import("@/pages/PokemonBrowserPage"));
const PokemonDetailPage = lazy(() => import("@/pages/PokemonDetailPage"));
const ComparisonPage = lazy(() => import("@/pages/ComparisonPage"));
const TypeChartPage = lazy(() => import("@/pages/TypeChartPage"));
const MoveBrowserPage = lazy(() => import("@/pages/MoveBrowserPage"));
const ItemBrowserPage = lazy(() => import("@/pages/ItemBrowserPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="h-9 w-48 skeleton-shimmer rounded-xl" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-5">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square skeleton-shimmer rounded-xl"
            style={{
              opacity: 1 - i * 0.03,
              animationDelay: `${i * 0.04}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Suspense fallback={<PageFallback />}><PokemonBrowserPage /></Suspense>} />
            <Route path="/pokemon/:id" element={<Suspense fallback={<PageFallback />}><PokemonDetailPage /></Suspense>} />
            <Route path="/compare" element={<Suspense fallback={<PageFallback />}><ComparisonPage /></Suspense>} />
            <Route path="/types" element={<Suspense fallback={<PageFallback />}><TypeChartPage /></Suspense>} />
            <Route path="/moves" element={<Suspense fallback={<PageFallback />}><MoveBrowserPage /></Suspense>} />
            <Route path="/items" element={<Suspense fallback={<PageFallback />}><ItemBrowserPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<PageFallback />}><SettingsPage /></Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
