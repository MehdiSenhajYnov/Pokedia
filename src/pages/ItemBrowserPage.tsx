import { useMemo, useRef, useState, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Tag, LayoutGrid, List } from "lucide-react";
import { motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAllItems } from "@/hooks/use-items";
import { useSearchStore } from "@/stores/search-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTabStore } from "@/stores/tab-store";
import { cn } from "@/lib/utils";
import { SearchCrossResults } from "@/components/layout/SearchCrossResults";
import { GlassCard, GlassToolbar } from "@/components/ui/liquid-glass";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ItemSummary } from "@/types";

const GRID_CARD_MIN_WIDTH = 300;
const GRID_CARD_HEIGHT = 132;
const GRID_GAP = 16;

const ROW_HEIGHT = 56;

export default function ItemBrowserPage() {
  usePageTitle("Items");
  const { data: allItems, isLoading } = useAllItems();
  const {
    query,
    itemCategoryFilter,
    itemViewMode,
    setItemCategoryFilter,
    setItemViewMode,
  } = useSearchStore();

  const categories = useMemo(() => {
    if (!allItems) return [];
    const cats = new Set(
      allItems.map((i) => i.category).filter((c): c is string => c !== null),
    );
    return Array.from(cats).sort();
  }, [allItems]);

  const filtered = useMemo(() => {
    let result = allItems ?? [];
    if (query) {
      const q = query.toLowerCase();
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
  }, [allItems, query, itemCategoryFilter]);

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
    <div className="flex flex-col gap-4 p-5 flex-1 min-h-0 overflow-hidden">
      {/* Toolbar */}
      <GlassToolbar className="rounded-2xl border border-border/30">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
          <Select value={itemCategoryFilter ?? "__all__"} onValueChange={(v) => setItemCategoryFilter(v === "__all__" ? null : v)}>
            <SelectTrigger className="w-auto min-w-[150px]" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="relative flex rounded-xl bg-white/5 border border-white/10 p-0.5" role="group" aria-label="View mode">
            <motion.div
              className="absolute top-0.5 bottom-0.5 rounded-lg bg-white/10"
              layout
              style={{
                width: "calc(50% - 2px)",
                left: itemViewMode === "grid" ? 2 : "calc(50%)",
              }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
            <button
              onClick={() => setItemViewMode("grid")}
              className={cn(
                "relative z-10 flex h-8 w-9 items-center justify-center transition-colors",
                itemViewMode === "grid"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Grid view"
              aria-pressed={itemViewMode === "grid"}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setItemViewMode("list")}
              className={cn(
                "relative z-10 flex h-8 w-9 items-center justify-center transition-colors",
                itemViewMode === "list"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="List view"
              aria-pressed={itemViewMode === "list"}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            <span>{filtered.length} items</span>
          </div>
        </div>
      </GlassToolbar>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-16 gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Package className="h-10 w-10 text-muted-foreground/40 animate-[float_3s_ease-in-out_infinite]" />
          <p className="text-sm text-muted-foreground">
            No items found matching your search.
          </p>
        </motion.div>
      ) : itemViewMode === "grid" ? (
        <VirtualizedItemGrid items={filtered} />
      ) : (
        <VirtualizedItemList items={filtered} />
      )}

      {query.length >= 2 && <SearchCrossResults exclude="items" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid view
// ---------------------------------------------------------------------------

function VirtualizedItemGrid({ items }: { items: ItemSummary[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(2);
  const navigate = useNavigate();
  const { itemName: getItemName, description: getDescription } = useSettingsStore();
  const { openTab } = useTabStore();

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      setColumns(Math.max(1, Math.floor((w + GRID_GAP) / (GRID_CARD_MIN_WIDTH + GRID_GAP))));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleItemClick = useCallback(
    (item: ItemSummary) => {
      openTab({
        kind: "item",
        entityId: item.id,
        nameEn: item.name_en ?? "",
        nameFr: item.name_fr ?? "",
        typeKey: null,
        spriteUrl: item.sprite_url,
      });
      navigate(`/items/${item.id}`);
    },
    [openTab, navigate],
  );

  const handleMiddleClick = useCallback(
    (item: ItemSummary) => {
      openTab({
        kind: "item",
        entityId: item.id,
        nameEn: item.name_en ?? "",
        nameFr: item.name_fr ?? "",
        typeKey: null,
        spriteUrl: item.sprite_url,
      }, true);
    },
    [openTab],
  );

  const rowCount = Math.ceil(items.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => GRID_CARD_HEIGHT + GRID_GAP,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="flex-1 min-h-0 overflow-y-auto"
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
                gap: `${GRID_GAP}px`,
              }}
            >
              {rowItems.map((item) => (
                <GridItemCard
                  key={item.id}
                  item={item}
                  name={getItemName(item.name_en, item.name_fr)}
                  effect={getDescription(item.effect_en, item.effect_fr)}
                  onClick={handleItemClick}
                  onMiddleClick={handleMiddleClick}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface GridItemCardProps {
  item: ItemSummary;
  name: string;
  effect: string;
  onClick: (item: ItemSummary) => void;
  onMiddleClick: (item: ItemSummary) => void;
}

const GridItemCard = memo(function GridItemCard({ item, name, effect, onClick, onMiddleClick }: GridItemCardProps) {
  return (
    <div
      onClick={() => onClick(item)}
      onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); onMiddleClick(item); } }}
      className="group flex gap-3 rounded-2xl glass-flat border border-border/30 px-4 py-4 cursor-pointer hover:border-primary/30 hover:shadow-warm hover:-translate-y-1 transition-all duration-200"
    >
      {item.sprite_url ? (
        <img
          src={item.sprite_url}
          alt=""
          loading="lazy"
          className="h-12 w-12 object-contain flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/8 text-muted-foreground flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200">
          <Package className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-heading text-[15px] font-semibold leading-tight truncate">
            {name || "Unknown Item"}
          </span>
          {item.category && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 font-heading text-xs font-medium text-muted-foreground flex-shrink-0">
              <Tag className="h-2.5 w-2.5" />
              {item.category}
            </span>
          )}
        </div>
        {effect && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {effect}
          </p>
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

function VirtualizedItemList({ items }: { items: ItemSummary[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { itemName: getItemName, description: getDescription } = useSettingsStore();
  const { openTab } = useTabStore();

  const handleRowClick = useCallback(
    (item: ItemSummary) => {
      openTab({
        kind: "item",
        entityId: item.id,
        nameEn: item.name_en ?? "",
        nameFr: item.name_fr ?? "",
        typeKey: null,
        spriteUrl: item.sprite_url,
      });
      navigate(`/items/${item.id}`);
    },
    [openTab, navigate],
  );

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  return (
    <div
      ref={parentRef}
      className="flex-1 min-h-0 overflow-y-auto"
    >
    <GlassCard className="overflow-hidden rounded-xl border border-border/30">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 glass-heavy">
          <tr className="border-b border-border/30 font-heading text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
            <th className="w-10 px-2 py-3" scope="col"><span className="sr-only">Sprite</span></th>
            <th className="px-4 py-3 text-left" scope="col">Name</th>
            <th className="px-4 py-3 text-left" scope="col">Category</th>
            <th className="px-4 py-3 text-left" scope="col">Effect</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }}>
            <td colSpan={4} />
          </tr>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = items[virtualRow.index];
            const name = getItemName(item.name_en, item.name_fr);
            const effect = getDescription(item.effect_en, item.effect_fr);
            return (
              <tr
                key={item.id}
                onClick={() => handleRowClick(item)}
                onMouseDown={(e) => {
                  if (e.button !== 1) return;
                  e.preventDefault();
                  openTab({
                    kind: "item",
                    entityId: item.id,
                    nameEn: item.name_en ?? "",
                    nameFr: item.name_fr ?? "",
                    typeKey: null,
                    spriteUrl: item.sprite_url,
                  }, true);
                }}
                className="border-b border-border/20 cursor-pointer hover:bg-primary/5 transition-colors"
                style={{ height: ROW_HEIGHT }}
              >
                <td className="px-2 py-1.5">
                  {item.sprite_url ? (
                    <img
                      src={item.sprite_url}
                      alt=""
                      className="h-10 w-10 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-white/8 text-muted-foreground">
                      <Package className="h-4 w-4" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-heading text-[15px] font-medium">
                    {name || "Unknown Item"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {item.category ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 font-heading text-xs font-medium text-muted-foreground">
                      <Tag className="h-2.5 w-2.5" />
                      {item.category}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {effect || "—"}
                  </span>
                </td>
              </tr>
            );
          })}
          <tr style={{ height: virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0) }}>
            <td colSpan={4} />
          </tr>
        </tbody>
      </table>
    </GlassCard>
    </div>
  );
}
