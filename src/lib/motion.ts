import type { Transition, Variants } from "framer-motion";

// ─── Spring presets ─────────────────────────────────────────────────
export const springSnappy: Transition = { type: "spring", stiffness: 500, damping: 30 };
export const springBounce: Transition = { type: "spring", stiffness: 300, damping: 20 };
export const springGentle: Transition = { type: "spring", stiffness: 200, damping: 25 };
export const springWobbly: Transition = { type: "spring", stiffness: 350, damping: 12 };
export const springStatBar: Transition = { type: "spring", stiffness: 200, damping: 22, mass: 0.8 };

// ─── Page transitions ───────────────────────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 12, scale: 0.97 },
};

export const pageTransition: Transition = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1],
};

// ─── Stagger containers ─────────────────────────────────────────────
export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springGentle },
};

// ─── Stat bar animation ─────────────────────────────────────────────
export const statBarVariants: Variants = {
  initial: { scaleX: 0 },
  animate: (pct: number) => ({
    scaleX: pct / 100,
    transition: springStatBar,
  }),
};

// ─── Dialog animations ──────────────────────────────────────────────
export const dialogOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const dialogContent: Variants = {
  initial: { opacity: 0, scale: 0.92, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.92, y: 10, transition: { duration: 0.15 } },
};

// ─── Micro-interactions ─────────────────────────────────────────────
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: springSnappy },
};

export const scalePop: Variants = {
  initial: { scale: 0 },
  animate: { scale: 1, transition: springSnappy },
  exit: { scale: 0, transition: { duration: 0.15 } },
};

export const heartBurst: Variants = {
  initial: { scale: 0 },
  animate: { scale: [0, 1.4, 1], transition: { duration: 0.4 } },
  exit: { scale: 0, transition: { duration: 0.15 } },
};

export const navItemVariants: Variants = {
  rest: { x: 0, scale: 1 },
  hover: { x: 3, scale: 1.02 },
};

export const spriteFloat: Variants = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
};

// sectionReveal removed — use detailSection instead

export const noResultsShake: Variants = {
  initial: { x: 0 },
  animate: {
    x: [0, -4, 4, -3, 3, 0],
    transition: { duration: 0.4 },
  },
};

// ─── Detail page stagger ────────────────────────────────────────────
export const detailStagger: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

export const detailSection: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// ─── Tab bar ────────────────────────────────────────────────────────
export const tabBarVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export const tabPillVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.1 } },
};
