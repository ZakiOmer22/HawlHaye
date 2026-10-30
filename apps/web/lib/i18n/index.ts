import { LANGUAGES, type Language } from "./types";
import { en, type TranslationKey } from "./en";
import { so } from "./so";
import { ar } from "./ar";

const DICTS: Record<Language, Record<TranslationKey, string>> = { en, so, ar };

/**
 * Look up a translated string.
 *
 * `vars` supports `{name}` placeholders — any key present in `vars` is
 * substituted; unknown placeholders are left untouched so a missing value
 * is obvious in the UI rather than failing silently.
 */
export function translate(
  lang: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const dict = DICTS[lang] ?? en;
  const template = dict[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  );
}

/** Direction for a language — used by the preferences provider. */
export function dirFor(lang: Language): "ltr" | "rtl" {
  return LANGUAGES.find((l) => l.code === lang)?.dir ?? "ltr";
}

export { LANGUAGES };
export type { Language } from "./types";
export type { TranslationKey } from "./en";
