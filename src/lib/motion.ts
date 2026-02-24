import type { Transition, Variants } from "framer-motion";

// ─── Spring presets ─────────────────────────────────────────────────
export const springSnappy: Transition = { type: "spring", stiffness: 500, damping: 30 };
export const springBounce: Transition = { type: "spring", stiffness: 300, damping: 20 };
export const springGentle: Transition = { type: "spring", stiffness: 200, damping: 25 };
export const springPlayful: Transition = { type: "spring", stiffness: 400, damping: 15 };
export const springWobbly: Transition = { type: "spring", stiffness: 350, damping: 12 };

// ─── Page transitions ───────────────────────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 30, scale: 0.96, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: -20, scale: 0.97, filter: "blur(4px)" },
};

export const pageTransition: Transition = {
  duration: 0.4,
  ease: [0.25, 0.1, 0.25, 1],
};

// ─── Stagger containers ─────────────────────────────────────────────
export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springGentle },
};

// ─── Stat bar animation ─────────────────────────────────────────────
export const statBarVariants: Variants = {
  initial: { scaleX: 0 },
  animate: (pct: number) => ({
    scaleX: pct / 100,
    transition: springBounce,
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
  exit: { opacity: 0, scale: 0.92, y: 10 },
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
  hover: { x: 6, scale: 1.02 },
};

export const cardHover = {
  whileHover: { y: -6 },
  whileTap: { scale: 0.97 },
};

export const spriteFloat: Variants = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
};

export const sectionReveal: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export const pokeballSpin: Variants = {
  animate: {
    rotate: [0, 15, -15, 10, -10, 0],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
  },
};

export const noResultsShake: Variants = {
  animate: {
    x: [0, -4, 4, -3, 3, 0],
    transition: { duration: 0.4 },
  },
};
