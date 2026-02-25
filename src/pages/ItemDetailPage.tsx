import { useParams, Link, useNavigate } from "react-router-dom";
import { useItemDetail, useAllItems } from "@/hooks/use-items";
import { useGameItemLocations, useSelectedGame } from "@/hooks/use-games";
import { useSettingsStore } from "@/stores/settings-store";
import { useTabStore } from "@/stores/tab-store";
import { usePageTitle } from "@/hooks/use-page-title";
import { detailStagger, detailSection, spriteFloat } from "@/lib/motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Package, Tag, MapPin, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useCallback, useMemo } from "react";
import { GlassCard, GlassPill } from "@/components/ui/liquid-glass";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const itemId = id ? parseInt(id, 10) : null;

  const { data: item, isLoading } = useItemDetail(itemId);
  const { data: allItems } = useAllItems();
  const { itemName, description } = useSettingsStore();
  const selectedGameId = useSettingsStore((s) => s.selectedGameId);
  const selectedGame = useSelectedGame();
  const { data: gameItemLocations } = useGameItemLocations(item?.name_key);
  const { openTab } = useTabStore();

  const { prevId, nextId } = useMemo(() => {
    if (!allItems || !itemId) return { prevId: null, nextId: null };
    const idx = allItems.findIndex((i) => i.id === itemId);
    return {
      prevId: idx > 0 ? allItems[idx - 1].id : null,
      nextId: idx >= 0 && idx < allItems.length - 1 ? allItems[idx + 1].id : null,
    };
  }, [allItems, itemId]);

  const name = item ? itemName(item.name_en, item.name_fr) : "";

  usePageTitle(item ? name : "Loading...");

  useEffect(() => {
    if (itemId && item) {
      openTab({
        kind: "item",
        entityId: itemId,
        nameEn: item.name_en ?? "",
        nameFr: item.name_fr ?? "",
        typeKey: null,
        spriteUrl: item.sprite_url,
      });
    }
  }, [itemId, item, openTab]);

  const handleKeyNav = useCallback(
    (e: KeyboardEvent) => {
      if (!item) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft" && prevId !== null) {
        navigate(`/items/${prevId}`);
      } else if (e.key === "ArrowRight" && nextId !== null) {
        navigate(`/items/${nextId}`);
      }
    },
    [item, navigate, prevId, nextId],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyNav);
    return () => window.removeEventListener("keydown", handleKeyNav);
  }, [handleKeyNav]);

  if (isLoading || item === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="h-24 w-24 skeleton-shimmer rounded-full" />
            <div className="h-6 w-48 skeleton-shimmer rounded-xl" />
            <div className="h-4 w-24 skeleton-shimmer rounded-full" />
          </div>
          <div className="h-20 skeleton-shimmer rounded-xl" />
        </div>
      </div>
    );
  }

  if (item === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Package className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="font-heading text-xl font-semibold">Item not found</h2>
        <button
          onClick={() => navigate("/items")}
          className="flex h-8 items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 text-xs hover:shadow-warm transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Items
        </button>
      </div>
    );
  }

  const effectText = description(item.effect_en, item.effect_fr);

  return (
    <motion.div
      className="mx-auto max-w-3xl space-y-8 p-6 relative"
      variants={detailStagger}
      initial="initial"
      animate="animate"
    >
      {/* ── Navigation ── */}
      <motion.div variants={detailSection} className="flex items-center justify-between">
        <div className="flex gap-2">
          <GlassPill>
            <button
              onClick={() => navigate("/items")}
              className="flex h-8 items-center gap-1.5 px-3 text-xs hover:text-foreground transition-all"
              aria-label="Back to Items"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Items
            </button>
          </GlassPill>

          <GlassPill>
            <div className="flex items-center">
              {prevId !== null ? (
                <Link
                  to={`/items/${prevId}`}
                  onMouseDown={(e) => {
                    if (e.button !== 1 || !allItems) return;
                    e.preventDefault();
                    const prev = allItems.find((i) => i.id === prevId);
                    if (prev) openTab({ kind: "item", entityId: prev.id, nameEn: prev.name_en ?? "", nameFr: prev.name_fr ?? "", typeKey: null, spriteUrl: prev.sprite_url }, true);
                  }}
                  className="flex h-8 items-center px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Previous item"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="flex h-8 items-center px-2.5 text-xs text-muted-foreground/30">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="border-x border-white/10 px-2.5 font-mono text-xs text-muted-foreground">
                #{item.id}
              </span>
              {nextId !== null ? (
                <Link
                  to={`/items/${nextId}`}
                  onMouseDown={(e) => {
                    if (e.button !== 1 || !allItems) return;
                    e.preventDefault();
                    const next = allItems.find((i) => i.id === nextId);
                    if (next) openTab({ kind: "item", entityId: next.id, nameEn: next.name_en ?? "", nameFr: next.name_fr ?? "", typeKey: null, spriteUrl: next.sprite_url }, true);
                  }}
                  className="flex h-8 items-center px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Next item"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="flex h-8 items-center px-2.5 text-xs text-muted-foreground/30">
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </GlassPill>
        </div>
      </motion.div>

      {/* ── Hero ── */}
      <motion.div variants={detailSection} className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          {item.sprite_url ? (
            <motion.img
              src={item.sprite_url}
              alt={name}
              className="h-24 w-24 object-contain"
              variants={spriteFloat}
              animate="animate"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/5 border border-white/10">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold">{name}</h1>
          {item.category && (
            <div className="mt-2 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-muted-foreground">
                <Tag className="h-3 w-3" />
                {item.category}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Game indicator ── */}
      {selectedGame && (
        <motion.div variants={detailSection}>
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground">
            <Gamepad2 className="h-3.5 w-3.5 text-primary" />
            <span>
              Viewing with <strong className="text-foreground">{selectedGame.name_en}</strong> selected
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Effect ── */}
      {effectText && (
        <motion.section variants={detailSection}>
          <h2 className="mb-3 font-heading text-sm font-bold">
            <span className="border-b-2 border-primary pb-0.5">Effect</span>
          </h2>
          <GlassCard className="rounded-2xl border border-border/30">
            <div className="p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {effectText}
              </p>
            </div>
          </GlassCard>
        </motion.section>
      )}

      {/* ── Game Locations ── */}
      {selectedGame && gameItemLocations && gameItemLocations.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="mb-3 font-heading text-sm font-bold">
            <span className="border-b-2 border-primary pb-0.5">
              Locations in {selectedGame.name_en}
            </span>
          </h2>
          <GlassCard className="rounded-2xl border border-border/30">
            <div className="space-y-1.5 p-4">
              {gameItemLocations.map((loc, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0 text-primary" />
                  <span>{loc}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.section>
      )}
    </motion.div>
  );
}
