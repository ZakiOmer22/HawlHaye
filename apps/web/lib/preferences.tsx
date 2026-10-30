"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LANGUAGES, dirFor, translate, type Language, type TranslationKey } from "./i18n";

export type Theme = "dark" | "light";

type Vars = Record<string, string | number>;

interface PreferencesValue {
  language: Language;
  theme: Theme;
  setLanguage: (l: Language) => void;
  setTheme: (t: Theme) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

const LANG_KEY = "hawl-lang";
const THEME_KEY = "hawl-theme";

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  if (v && (allowed as readonly string[]).includes(v)) return v as T;
  return fallback;
}

function applyToDocument(language: Language, theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dir = dirFor(language);
  document.documentElement.dataset.theme = theme;
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on first mount
  useEffect(() => {
    const lang = readStored(LANG_KEY, ["en", "so", "ar"] as const, "en");
    const thm = readStored(THEME_KEY, ["dark", "light"] as const, "dark");
    setLanguageState(lang);
    setThemeState(thm);
    applyToDocument(lang, thm);
    setMounted(true);
  }, []);

  const setLanguage = useCallback(
    (l: Language) => {
      setLanguageState(l);
      try {
        window.localStorage.setItem(LANG_KEY, l);
      } catch {
        /* storage blocked — ignore */
      }
      applyToDocument(l, theme);
    },
    [theme],
  );

  const setTheme = useCallback(
    (thm: Theme) => {
      setThemeState(thm);
      try {
        window.localStorage.setItem(THEME_KEY, thm);
      } catch {
        /* ignore */
      }
      applyToDocument(language, thm);
    },
    [language],
  );

  const t = useCallback(
    (key: TranslationKey, vars?: Vars) => translate(language, key, vars),
    [language],
  );

  const value = useMemo<PreferencesValue>(
    () => ({ language, theme, setLanguage, setTheme, t }),
    [language, theme, setLanguage, setTheme, t],
  );

  // Hide children until we've hydrated from localStorage so we don't
  // flash the wrong language/theme for one frame.
  if (!mounted) {
    return (
      <PreferencesContext.Provider value={value}>
        <div style={{ visibility: "hidden" }} aria-hidden="true">
          {children}
        </div>
      </PreferencesContext.Provider>
    );
  }

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used inside <PreferencesProvider>");
  }
  return ctx;
}

// Re-export so pages can import from one place
export { LANGUAGES };
export type { Language, TranslationKey };
