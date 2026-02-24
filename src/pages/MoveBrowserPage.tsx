import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, ChevronUp, Swords } from "lucide-react";
import { useAllMoves } from "@/hooks/use-moves";
import { useMoveById } from "@/hooks/use-moves";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSearchStore } from "@/stores/search-store";
import { useSettingsStore } from "@/stores/settings-store";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { DamageClassIcon } from "@/components/moves/DamageClassIcon";
import { ALL_TYPES, TYPE_COLORS_HEX } from "@/lib/constants";
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

const ROW_HEIGHT = 40;

export default function MoveBrowserPage() {
  usePageTitle("Moves");
  const { data: allMoves, isLoading } = useAllMoves();
  const {
    moveQuery,
    moveTypeFilter,
    moveDamageClassFilter,
    movePowerMin,
    movePowerMax,
    expandedMoveId,
    setMoveQuery,
    setExpandedMoveId,
    setMoveTypeFilter,
    setMoveDamageClassFilter,
    setMovePowerMin,
    setMovePowerMax,
  } = useSearchStore();
  const { moveName } = useSettingsStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (expandedMoveId !== null) {
      setExpandedId(expandedMoveId);
      setExpandedMoveId(null);
    }
  }, [expandedMoveId, setExpandedMoveId]);

  const filtered = useMemo(() => {
    let result = allMoves ?? [];
    if (moveQuery) {
      const q = moveQuery.toLowerCase();
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
  }, [allMoves, moveQuery, moveTypeFilter, moveDamageClassFilter, movePowerMin, movePowerMax]);

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
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search moves..."
            value={moveQuery}
            onChange={(e) => setMoveQuery(e.target.value)}
            className="h-9 w-full rounded-full glass border border-border/40 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
          />
        </div>

        <select
          value={moveTypeFilter ?? ""}
          onChange={(e) => setMoveTypeFilter(e.target.value || null)}
          className="h-9 rounded-xl glass border border-border/40 px-3 text-sm cursor-pointer"
        >
          <option value="">All types</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={moveDamageClassFilter ?? ""}
          onChange={(e) =>
            setMoveDamageClassFilter(e.target.value || null)
          }
          className="h-9 rounded-xl glass border border-border/40 px-3 text-sm cursor-pointer"
        >
          <option value="">All classes</option>
          <option value="physical">Physical</option>
          <option value="special">Special</option>
          <option value="status">Status</option>
        </select>

        <div className="flex items-center gap-1.5">
          <span className="font-heading text-xs text-muted-foreground">Pow:</span>
          <input
            type="number"
            placeholder="Min"
            value={movePowerMin ?? ""}
            onChange={(e) => setMovePowerMin(e.target.value ? Number(e.target.value) : null)}
            className="h-9 w-16 rounded-xl glass border border-border/40 px-2 text-sm text-center font-mono outline-none focus:ring-2 focus:ring-ring/50"
            min={0}
            aria-label="Minimum power"
          />
          <span className="text-xs text-muted-foreground">&ndash;</span>
          <input
            type="number"
            placeholder="Max"
            value={movePowerMax ?? ""}
            onChange={(e) => setMovePowerMax(e.target.value ? Number(e.target.value) : null)}
            className="h-9 w-16 rounded-xl glass border border-border/40 px-2 text-sm text-center font-mono outline-none focus:ring-2 focus:ring-ring/50"
            min={0}
            aria-label="Maximum power"
          />
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Swords className="h-3.5 w-3.5" />
          <span>{filtered.length} moves</span>
        </div>
      </div>

      {/* Table */}
      <div
        ref={parentRef}
        className="overflow-y-auto rounded-xl glass border border-border/30"
        style={{ height: "calc(100vh - 220px)" }}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 glass">
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
                <th className="w-8" />
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No moves found matching your filters.
                </td>
              </tr>
            ) : (
              <>
                <tr style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }}>
                  <td colSpan={columns.length + 1} />
                </tr>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  const isExpanded = expandedId === row.original.id;
                  return (
                    <tr
                      key={row.id}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : row.original.id)
                      }
                      className={`border-b border-border/20 cursor-pointer transition-colors ${
                        isExpanded
                          ? "bg-accent/60"
                          : "hover:bg-primary/5"
                      }`}
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
                      <td className="px-2 py-2 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ height: virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0) }}>
                  <td colSpan={columns.length + 1} />
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded detail panel */}
      <AnimatePresence>
        {expandedId !== null && (
          <MoveDetailPanel moveId={expandedId} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MoveDetailPanel({ moveId }: { moveId: number }) {
  const { data: detail, isLoading } = useMoveById(moveId);
  const { moveName: getMoveName, description } = useSettingsStore();
  const typeHex = detail?.type_key ? TYPE_COLORS_HEX[detail.type_key] : undefined;

  return (
    <motion.div
      className="rounded-2xl glass border border-border/30 p-4 space-y-2"
      style={typeHex ? { borderTopColor: `${typeHex}60`, borderTopWidth: 2 } : undefined}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 w-48 skeleton-shimmer rounded-xl" />
          <div className="h-3 w-full skeleton-shimmer rounded-xl" />
        </div>
      ) : detail ? (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-heading font-semibold text-sm">
              {getMoveName(detail.name_en, detail.name_fr)}
            </span>
            {detail.type_key && <TypeBadge type={detail.type_key} size="md" />}
            <DamageClassIcon damageClass={detail.damage_class} showLabel />
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              Power:{" "}
              <span className="text-foreground font-mono">
                {detail.power ?? "\u2014"}
              </span>
            </span>
            <span>
              Accuracy:{" "}
              <span className="text-foreground font-mono">
                {detail.accuracy !== null ? `${detail.accuracy}%` : "\u2014"}
              </span>
            </span>
            <span>
              PP:{" "}
              <span className="text-foreground font-mono">
                {detail.pp ?? "\u2014"}
              </span>
            </span>
            <span>
              Priority:{" "}
              <span className="text-foreground font-mono">
                {detail.priority ?? 0}
              </span>
            </span>
          </div>

          {(detail.effect_en || detail.effect_fr) && (
            <p className="text-sm text-muted-foreground leading-relaxed pt-1 border-t border-border/30">
              {description(detail.effect_en, detail.effect_fr)}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Move details not found.</p>
      )}
    </motion.div>
  );
}
