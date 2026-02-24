import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Sets the native window title. Falls back silently in web browser.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const fullTitle = title ? `Pokedia — ${title}` : "Pokedia";
    getCurrentWindow().setTitle(fullTitle).catch(() => {
      // Fallback for web browser context
      document.title = fullTitle;
    });
  }, [title]);
}
