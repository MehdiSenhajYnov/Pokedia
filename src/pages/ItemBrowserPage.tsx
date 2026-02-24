import { useMemo, useRef, useCallback } from "react";
import { Search, Package, Tag } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAllItems } from "@/hooks/use-items";
import { useSearchStore } from "@/stores/search-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { ItemSummary } from "@/types";

const CARD_MIN_WIDTH = 300;
const CARD_HEIGHT = 100;
const GAP = 12;

export default function ItemBrowserPage() {
  usePageTitle("Items");
  const { data: allItems, isLoading } = useAllItems();
  const {
    itemQuery,
    itemCategoryFilter,
    setItemQuery,
    setItemCategoryFilter,
  } = useSearchStore();
  const { itemName } = useSettingsStore();

  const categories = useMemo(() => {
    if (!allItems) return [];
    const cats = new Set(
      allItems.map((i) => i.category).filter((c): c is string => c !== null),
    );
    return Array.from(cats).sort();
  }, [allItems]);

  const filtered = useMemo(() => {
    let result = allItems ?? [];
    if (itemQuery) {
      const q = itemQuery.toLowerCase();
      result = result.filter(
        (i) =>
          (i.name_en?.toLowerCase().includes(q) ?? false) ||
          (i.name_fr?.toLowerCase().includes(q) ?? false) ||
          i.id.toString() === q,
      );
    }
    if (itemCategoryFilter) {
      result = result.filter((i) => i.category === itemCategoryFilter);
    }
    return result;
  }, [allItems, itemQuery, itemCategoryFilter]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-muted"
              style={{ opacity: 1 - i * 0.03 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items..."
            value={itemQuery}
            onChange={(e) => setItemQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
          />
        </div>

        <select
          value={itemCategoryFilter ?? ""}
          onChange={(e) =>
            setItemCategoryFilter(e.target.value || null)
          }
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm cursor-pointer hover:bg-accent transition-colors"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          <span>{filtered.length} items</span>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Package className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No items found matching your search.
          </p>
        </div>
      ) : (
        <VirtualizedItemGrid items={filtered} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Virtualized Item Grid                                              */
/* ------------------------------------------------------------------ */

function VirtualizedItemGrid({ items }: { items: ItemSummary[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const getColumns = useCallback(() => {
    const w = parentRef.current?.clientWidth ?? 800;
    return Math.max(1, Math.floor((w + GAP) / (CARD_MIN_WIDTH + GAP)));
  }, []);

  const columns = getColumns();
  const rowCount = Math.ceil(items.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT + GAP,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto"
      style={{ contain: "strict", height: "calc(100vh - 180px)" }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: "relative",
          width: "100%",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIdx = virtualRow.index * columns;
          const rowItems = items.slice(startIdx, startIdx + columns);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: virtualRow.start,
                left: 0,
                right: 0,
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN_WIDTH}px, 1fr))`,
                gap: `${GAP}px`,
              }}
            >
              {rowItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Item Card                                                          */
/* ------------------------------------------------------------------ */

function ItemCard({ item }: { item: ItemSummary }) {
  const { itemName: getItemName, description: getDesc } = useSettingsStore();
  const name = getItemName(item.name_en, item.name_fr);
  const effect = getDesc(item.effect_en, item.effect_fr);

  return (
    <div className="group flex gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
      {/* Sprite */}
      {item.sprite_url ? (
        <img
          src={item.sprite_url}
          alt={name}
          className="h-12 w-12 object-contain flex-shrink-0 group-hover:scale-110 transition-transform"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground flex-shrink-0">
          <Package className="h-5 w-5" />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold leading-tight">
            {name || "Unknown Item"}
          </span>
          {item.category && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Tag className="h-2.5 w-2.5" />
              {item.category}
            </span>
          )}
        </div>
        {effect ? (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {effect}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground/50 italic">
            No description available.
          </p>
        )}
      </div>
    </div>
  );
}
