import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@tinymomentum/liquid-glass-react/dist/components/LiquidGlassBase.css";
import "./index.css";
import App from "./App.tsx";

// Apply initial theme
const stored = localStorage.getItem("pokedia-settings");
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    if (parsed.state?.theme === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch {
    document.documentElement.classList.add("dark");
  }
} else {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
