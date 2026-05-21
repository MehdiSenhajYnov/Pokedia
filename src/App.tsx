import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";

const PokemonBrowserPage = lazy(() => import("@/pages/PokemonBrowserPage"));
const PokemonDetailPage = lazy(() => import("@/pages/PokemonDetailPage"));
const ComparisonPage = lazy(() => import("@/pages/ComparisonPage"));
const TypeChartPage = lazy(() => import("@/pages/TypeChartPage"));
const MoveBrowserPage = lazy(() => import("@/pages/MoveBrowserPage"));
const MoveDetailPage = lazy(() => import("@/pages/MoveDetailPage"));
const ItemBrowserPage = lazy(() => import("@/pages/ItemBrowserPage"));
const ItemDetailPage = lazy(() => import("@/pages/ItemDetailPage"));
const NatureBrowserPage = lazy(() => import("@/pages/NatureBrowserPage"));
const AbilityBrowserPage = lazy(() => import("@/pages/AbilityBrowserPage"));
const AbilityDetailPage = lazy(() => import("@/pages/AbilityDetailPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function GridFallback() {
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

function TableFallback() {
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="h-9 w-48 skeleton-shimmer rounded-xl" />
      <div className="flex flex-col gap-2">
        <div className="h-10 skeleton-shimmer rounded-lg" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-12 skeleton-shimmer rounded-lg"
            style={{
              opacity: 1 - i * 0.04,
              animationDelay: `${i * 0.04}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function DetailFallback() {
  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="flex items-center gap-4">
        <div className="h-32 w-32 skeleton-shimmer rounded-2xl" />
        <div className="flex flex-col gap-3">
          <div className="h-8 w-56 skeleton-shimmer rounded-xl" />
          <div className="flex gap-2">
            <div className="h-6 w-16 skeleton-shimmer rounded-full" />
            <div className="h-6 w-16 skeleton-shimmer rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 skeleton-shimmer rounded-xl"
            style={{
              opacity: 1 - i * 0.06,
              animationDelay: `${i * 0.06}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="font-heading text-6xl font-bold text-muted-foreground/30">404</span>
      <h2 className="font-heading text-xl font-semibold">Page not found</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        The page you're looking for doesn't exist.{" "}
        <Link to="/" className="font-medium text-primary underline">
          Go back to the Pokédex
        </Link>
      </p>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Suspense fallback={<GridFallback />}><PokemonBrowserPage /></Suspense>} />
            <Route path="/pokemon/:id" element={<Suspense fallback={<DetailFallback />}><PokemonDetailPage /></Suspense>} />
            <Route path="/compare" element={<Suspense fallback={<DetailFallback />}><ComparisonPage /></Suspense>} />
            <Route path="/types" element={<Suspense fallback={<GridFallback />}><TypeChartPage /></Suspense>} />
            <Route path="/moves" element={<Suspense fallback={<TableFallback />}><MoveBrowserPage /></Suspense>} />
            <Route path="/moves/:id" element={<Suspense fallback={<DetailFallback />}><MoveDetailPage /></Suspense>} />
            <Route path="/items" element={<Suspense fallback={<GridFallback />}><ItemBrowserPage /></Suspense>} />
            <Route path="/items/:id" element={<Suspense fallback={<DetailFallback />}><ItemDetailPage /></Suspense>} />
            <Route path="/natures" element={<Suspense fallback={<TableFallback />}><NatureBrowserPage /></Suspense>} />
            <Route path="/abilities" element={<Suspense fallback={<GridFallback />}><AbilityBrowserPage /></Suspense>} />
            <Route path="/abilities/:id" element={<Suspense fallback={<DetailFallback />}><AbilityDetailPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<GridFallback />}><SettingsPage /></Suspense>} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
