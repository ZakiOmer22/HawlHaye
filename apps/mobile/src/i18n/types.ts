export type Language = "en" | "so" | "ar";
export type Dir = "ltr" | "rtl";

export const LANGUAGES: {
  code: Language;
  label: string;
  native: string;
  dir: Dir;
}[] = [
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "so", label: "Somali", native: "Soomaali", dir: "ltr" },
  { code: "ar", label: "Arabic", native: "العربية", dir: "rtl" },
];
