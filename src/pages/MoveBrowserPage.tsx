import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swords } from "lucide-react";
import { useAllMoves } from "@/hooks/use-moves";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSearchStore } from "@/stores/search-store";
import { useSettingsStore } from "@/stores/settings-store";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { DamageClassIcon } from "@/components/moves/DamageClassIcon";
import { ALL_TYPES } from "@/lib/constants";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { MoveSummary } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { scalePop } from "@/lib/motion";
import { useTabStore } from "@/stores/tab-store";
import { SearchCrossResults } from "@/components/layout/SearchCrossResults";
import { GlassCard, GlassToolbar } from "@/components/ui/liquid-glass";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROW_HEIGHT = 40;

export default function MoveBrowserPage() {
  usePageTitle("Moves");
  const { data: allMoves, isLoading } = useAllMoves();
  const navigate = useNavigate();
  const {
    query,
    moveTypeFilter,
    moveDamageClassFilter,
    movePowerMin,
    movePowerMax,
    setMoveTypeFilter,
    setMoveDamageClassFilter,
    setMovePowerMin,
    setMovePowerMax,
  } = useSearchStore();
  const { moveName } = useSettingsStore();
  const { openTab } = useTabStore();
  const [sorting, setSorting] = useState<SortingState>([]);

  const filtered = useMemo(() => {
    let result = allMoves ?? [];
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (m) =>
          (m.name_en?.toLowerCase().includes(q) ?? false) ||
          (m.name_fr?.toLowerCase().includes(q) ?? false) ||
          m.id.toString() === q,
      );
    }
    if (moveTypeFilter) {
      result = result.filter((m) => m.type_key === moveTypeFilter);
    }
    if (moveDamageClassFilter) {
      result = result.filter(
        (m) => m.damage_class === moveDamageClassFilter,
      );
    }
    if (movePowerMin !== null) {
      result = result.filter((m) => m.power !== null && m.power >= movePowerMin);
    }
    if (movePowerMax !== null) {
      result = result.filter((m) => m.power !== null && m.power <= movePowerMax);
    }
    return result;
  }, [allMoves, query, moveTypeFilter, moveDamageClassFilter, movePowerMin, movePowerMax]);

  const columns = useMemo<ColumnDef<MoveSummary>[]>(
    () => [
      {
        accessorKey: "type_key",
        header: "Type",
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v ? <TypeBadge type={v} /> : <span className="text-xs text-muted-foreground">--</span>;
        },
        size: 80,
      },
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => moveName(row.name_en, row.name_fr),
        cell: ({ getValue }) => (
          <span className="font-heading font-medium">{getValue() as string}</span>
        ),
        size: 180,
      },
      {
        accessorKey: "damage_class",
        header: "Class",
        cell: ({ getValue }) => (
          <DamageClassIcon
            damageClass={getValue() as string | null}
            showLabel
          />
        ),
        size: 100,
      },
      {
        accessorKey: "power",
        header: "Power",
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          return (
            <span className={v === null ? "text-muted-foreground" : "font-mono"}>
              {v ?? "\u2014"}
            </span>
          );
        },
        size: 70,
      },
      {
        accessorKey: "accuracy",
        header: "Acc.",
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          return (
            <span className={v === null ? "text-muted-foreground" : "font-mono"}>
              {v !== null ? `${v}%` : "\u2014"}
            </span>
          );
        },
        size: 70,
      },
      {
        accessorKey: "pp",
        header: "PP",
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          return (
            <span className={v === null ? "text-muted-foreground" : "font-mono"}>
              {v ?? "\u2014"}
            </span>
          );
        },
        size: 50,
      },
    ],
    [moveName],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        <div className="h-9 w-64 skeleton-shimmer rounded-full" />
        <div className="space-y-1.5">
          {Array.from({ length: 25 }).map((_, i) => (
            <div
              key={i}
              className="h-9 skeleton-shimmer rounded-xl"
              style={{ animationDelay: `${i * 0.04}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-4 p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Toolbar */}
      <GlassToolbar className="rounded-2xl border border-border/30">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
          <Select value={moveTypeFilter ?? "__all__"} onValueChange={(v) => setMoveTypeFilter(v === "__all__" ? null : v)}>
            <SelectTrigger className="w-auto min-w-[120px]" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All types</SelectItem>
              {ALL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={moveDamageClassFilter ?? "__all__"} onValueChange={(v) => setMoveDamageClassFilter(v === "__all__" ? null : v)}>
            <SelectTrigger className="w-auto min-w-[120px]" aria-label="Filter by class">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All classes</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
              <SelectItem value="special">Special</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <span className="font-heading text-xs text-muted-foreground">Pow:</span>
            <input
              type="number"
              placeholder="Min"
              value={movePowerMin ?? ""}
              onChange={(e) => setMovePowerMin(e.target.value ? Number(e.target.value) : null)}
              className="h-9 w-16 rounded-xl bg-white/5 border border-white/10 px-2 text-sm text-center font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              min={0}
              aria-label="Minimum power"
            />
            <span className="text-xs text-muted-foreground">&ndash;</span>
            <input
              type="number"
              placeholder="Max"
              value={movePowerMax ?? ""}
              onChange={(e) => setMovePowerMax(e.target.value ? Number(e.target.value) : null)}
              className="h-9 w-16 rounded-xl bg-white/5 border border-white/10 px-2 text-sm text-center font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              min={0}
              aria-label="Maximum power"
            />
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Swords className="h-3.5 w-3.5" />
            <span>{filtered.length} moves</span>
          </div>
        </div>
      </GlassToolbar>

      {/* Table */}
      <GlassCard className="overflow-hidden rounded-xl border border-border/30">
      <div
        ref={parentRef}
        className="overflow-y-auto"
        style={{ height: "calc(100vh - 220px)" }}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 glass-heavy">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-border/30"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-3 py-2.5 text-left font-heading text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground cursor-pointer hover:text-foreground select-none transition-colors"
                    style={{ width: header.column.getSize() }}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : "none"
                    }
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      <AnimatePresence mode="wait">
                        {header.column.getIsSorted() && (
                          <motion.span
                            className="text-primary"
                            variants={scalePop}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                          >
                            {header.column.getIsSorted() === "asc" ? " \u2191" : " \u2193"}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No moves found matching your filters.
                </td>
              </tr>
            ) : (
              <>
                <tr style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }}>
                  <td colSpan={columns.length} />
                </tr>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <tr
                      key={row.id}
                      onClick={() => {
                        const m = row.original;
                        openTab({
                          kind: "move",
                          entityId: m.id,
                          nameEn: m.name_en ?? "",
                          nameFr: m.name_fr ?? "",
                          typeKey: m.type_key,
                        });
                        navigate(`/moves/${m.id}`);
                      }}
                      className="border-b border-border/20 cursor-pointer hover:bg-primary/5 transition-colors"
                      style={{ height: ROW_HEIGHT }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr style={{ height: virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0) }}>
                  <td colSpan={columns.length} />
                </tr>
              </>
            )}
          </tbody>
        </table>
        {query.length >= 2 && <SearchCrossResults exclude="moves" />}
      </div>
      </GlassCard>

    </motion.div>
  );
}
