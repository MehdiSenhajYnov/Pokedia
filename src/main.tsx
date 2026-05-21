import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/space-grotesk/index.css";
import "@fontsource-variable/outfit/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "./index.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

const root = createRoot(rootElement);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function renderFatalError(error: unknown) {
  const message = getErrorMessage(error);

  root.render(
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#1f1f1f",
        color: "#f5f5f5",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "min(720px, 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          padding: "20px",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <h1 style={{ margin: "0 0 12px", fontSize: "20px" }}>Pokedia failed to start</h1>
        <p style={{ margin: "0 0 12px", color: "rgba(255,255,255,0.75)" }}>
          A frontend error occurred during startup.
        </p>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace',
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {message}
        </pre>
      </div>
    </div>,
  );
}

window.addEventListener("error", (event) => {
  console.error("Startup error:", event.error ?? event.message);
  renderFatalError(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection:", event.reason);
  renderFatalError(event.reason);
});

void import("./App.tsx")
  .then(({ default: App }) => {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  })
  .catch((error) => {
    console.error("Failed to load App.tsx:", error);
    renderFatalError(error);
  });
