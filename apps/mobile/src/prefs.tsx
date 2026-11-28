import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translate } from "./i18n";
import type { Language, TranslationKey } from "./i18n";
import { LANGUAGES } from "./i18n/types";
import { paletteFor, type Palette, type ThemeName } from "./theme";

interface Prefs {
  language: Language;
  theme: ThemeName;
  isRtl: boolean;
  palette: Palette;
  setLanguage: (l: Language) => void;
  setTheme: (t: ThemeName) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}
const Ctx = createContext<Prefs | null>(null);
const LANG_KEY = "hawl.lang";
const THEME_KEY = "hawl.theme";

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>("en");
  const [theme, setThemeState] = useState<ThemeName>("dark"); // web default is dark
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [l, t] = await Promise.all([
        AsyncStorage.getItem(LANG_KEY),
        AsyncStorage.getItem(THEME_KEY),
      ]);
      if (l === "en" || l === "so" || l === "ar") setLang(l);
      if (t === "dark" || t === "light") setThemeState(t);
      setReady(true);
    })();
  }, []);

  const setLanguage = useCallback((l: Language) => {
    setLang(l);
    void AsyncStorage.setItem(LANG_KEY, l);
  }, []);
  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    void AsyncStorage.setItem(THEME_KEY, t);
  }, []);
  const t = useCallback<Prefs["t"]>((key, vars) => translate(language, key, vars), [language]);
  const isRtl = LANGUAGES.find((x) => x.code === language)?.dir === "rtl";
  const palette = useMemo(() => paletteFor(theme), [theme]);

  const value = useMemo<Prefs>(
    () => ({ language, theme, isRtl, palette, setLanguage, setTheme, t }),
    [language, theme, isRtl, palette, setLanguage, setTheme, t],
  );
  if (!ready) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function usePrefs(): Prefs {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return v;
}
export const usePalette = () => usePrefs().palette;
export const useT = () => usePrefs().t;
