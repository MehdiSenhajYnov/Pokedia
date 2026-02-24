import { useParams, Link, useNavigate } from "react-router-dom";
import { useItemDetail, useAllItems } from "@/hooks/use-items";
import { useSettingsStore } from "@/stores/settings-store";
import { useTabStore } from "@/stores/tab-store";
import { usePageTitle } from "@/hooks/use-page-title";
import { sectionReveal, spriteFloat } from "@/lib/motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Package, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useCallback, useMemo } from "react";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const itemId = id ? parseInt(id, 10) : null;

  const { data: item, isLoading } = useItemDetail(itemId);
  const { data: allItems } = useAllItems();
  const { itemName, description } = useSettingsStore();
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
          className="flex h-8 items-center gap-1.5 rounded-full glass-light border border-border/40 px-3 text-xs hover:shadow-warm transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Items
        </button>
      </div>
    );
  }

  const effectText = description(item.effect_en, item.effect_fr);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 relative overflow-hidden">
      {/* ── Navigation ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/items")}
            className="flex h-8 items-center gap-1.5 rounded-full glass-light border border-border/40 px-3 text-xs hover:shadow-warm transition-all"
            aria-label="Back to Items"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Items
          </button>

          <div className="flex items-center rounded-full glass-light border border-border/40">
            {prevId !== null ? (
              <Link
                to={`/items/${prevId}`}
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
            <span className="border-x border-border/30 px-2.5 font-mono text-xs text-muted-foreground">
              #{item.id}
            </span>
            {nextId !== null ? (
              <Link
                to={`/items/${nextId}`}
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
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="flex flex-col items-center gap-4">
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
            <div className="flex h-24 w-24 items-center justify-center rounded-full glass-light border border-border/30">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold">{name}</h1>
          {item.category && (
            <div className="mt-2 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full glass-light border border-border/30 px-3 py-1 text-xs text-muted-foreground">
                <Tag className="h-3 w-3" />
                {item.category}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Effect ── */}
      {effectText && (
        <motion.section
          variants={sectionReveal}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h2 className="mb-3 font-heading text-sm font-bold">
            <span className="border-b-2 border-primary pb-0.5">Effect</span>
          </h2>
          <div className="rounded-2xl glass border border-border/30 p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {effectText}
            </p>
          </div>
        </motion.section>
      )}
    </div>
  );
}
