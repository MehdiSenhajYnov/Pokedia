import { useMemo, useRef, useState, useEffect } from "react";
import { Search, Package, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAllItems } from "@/hooks/use-items";
import { useSearchStore } from "@/stores/search-store";
import { useSettingsStore } from "@/stores/settings-store";
import { staggerContainer, staggerItem } from "@/lib/motion";
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

  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        <div className="h-9 w-64 skeleton-shimmer rounded-full" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="h-24 skeleton-shimmer rounded-2xl"
              style={{ animationDelay: `${i * 0.04}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items..."
            value={itemQuery}
            onChange={(e) => setItemQuery(e.target.value)}
            className="h-9 w-full rounded-full glass border border-border/40 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
          />
        </div>

        <select
          value={itemCategoryFilter ?? ""}
          onChange={(e) =>
            setItemCategoryFilter(e.target.value || null)
          }
          className="h-9 rounded-xl glass border border-border/40 px-3 text-sm cursor-pointer"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          <span>{filtered.length} items</span>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Package className="h-10 w-10 text-muted-foreground/40 animate-[float_3s_ease-in-out_infinite]" />
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

function VirtualizedItemGrid({ items }: { items: ItemSummary[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      setColumns(Math.max(1, Math.floor((w + GAP) / (CARD_MIN_WIDTH + GAP))));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      style={{ height: "calc(100vh - 180px)" }}
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
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
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

function ItemCard({ item }: { item: ItemSummary }) {
  const { itemName: getItemName, description: getDesc } = useSettingsStore();
  const name = getItemName(item.name_en, item.name_fr);
  const effect = getDesc(item.effect_en, item.effect_fr);

  return (
    <div className="group flex gap-3 rounded-2xl glass border border-border/30 p-4 hover:border-primary/30 hover:shadow-warm transition-all duration-200">
      {/* Sprite */}
      {item.sprite_url ? (
        <motion.img
          src={item.sprite_url}
          alt={name}
          className="h-12 w-12 object-contain flex-shrink-0"
          whileHover={{ scale: 1.15, rotate: [-2, 2, 0] }}
          transition={{ duration: 0.3 }}
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl glass text-muted-foreground flex-shrink-0">
          <Package className="h-5 w-5" />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-heading text-sm font-semibold leading-tight">
            {name || "Unknown Item"}
          </span>
          {item.category && (
            <span className="inline-flex items-center gap-1 rounded-full glass-subtle px-2 py-0.5 font-heading text-[10px] font-medium text-muted-foreground">
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
