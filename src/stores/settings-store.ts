import { create } from "zustand";
import { persist } from "zustand/middleware";

type Lang = "en" | "fr";
type Theme = "dark" | "light";

interface SettingsState {
  // --- Persisted settings ---
  langPokemonNames: Lang;
  langMoveNames: Lang;
  langItemNames: Lang;
  langDescriptions: Lang;
  theme: Theme;

  // --- Setters ---
  setLangPokemonNames: (lang: Lang) => void;
  setLangMoveNames: (lang: Lang) => void;
  setLangItemNames: (lang: Lang) => void;
  setLangDescriptions: (lang: Lang) => void;
  setAllLangs: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // --- Getters (handle nullable strings from Rust Option<String>) ---
  pokemonName: (nameEn: string | null, nameFr: string | null) => string;
  moveName: (nameEn: string | null, nameFr: string | null) => string;
  itemName: (nameEn: string | null, nameFr: string | null) => string;
  description: (descEn: string | null, descFr: string | null) => string;
}

/** Apply the theme class to the document root. */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

/**
 * Pick the localised value based on the chosen language.
 * Falls back to the other language, then to an empty string,
 * so callers never receive `null`.
 */
function pickLang(
  lang: Lang,
  en: string | null,
  fr: string | null,
): string {
  if (lang === "fr") return fr ?? en ?? "";
  return en ?? fr ?? "";
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Defaults: names in English, descriptions in French, dark theme
      langPokemonNames: "en",
      langMoveNames: "en",
      langItemNames: "en",
      langDescriptions: "fr",
      theme: "dark",

      // --- Individual setters ---
      setLangPokemonNames: (lang) => set({ langPokemonNames: lang }),
      setLangMoveNames: (lang) => set({ langMoveNames: lang }),
      setLangItemNames: (lang) => set({ langItemNames: lang }),
      setLangDescriptions: (lang) => set({ langDescriptions: lang }),

      setAllLangs: (lang) =>
        set({
          langPokemonNames: lang,
          langMoveNames: lang,
          langItemNames: lang,
          langDescriptions: lang,
        }),

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      toggleTheme: () => {
        const next: Theme = get().theme === "dark" ? "light" : "dark";
        set({ theme: next });
        applyTheme(next);
      },

      // --- Language-aware getters ---
      pokemonName: (nameEn, nameFr) =>
        pickLang(get().langPokemonNames, nameEn, nameFr),

      moveName: (nameEn, nameFr) =>
        pickLang(get().langMoveNames, nameEn, nameFr),

      itemName: (nameEn, nameFr) =>
        pickLang(get().langItemNames, nameEn, nameFr),

      description: (descEn, descFr) =>
        pickLang(get().langDescriptions, descEn, descFr),
    }),
    {
      name: "pokedia-settings",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        }
      },
    },
  ),
);
