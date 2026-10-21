import { retrieveLaunchParams } from "@telegram-apps/sdk-react";
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { readFlag, writeFlag } from "@/telegram/storage";
import { miniappAm, miniappEn, type MiniappKey } from "./miniapp";
import { catalogs, interpolate, type Language, type StringKey } from "./strings";

export type Key = StringKey | MiniappKey;

const tables: Record<Language, Record<Key, string>> = {
  en: { ...catalogs.en, ...miniappEn },
  am: { ...catalogs.am, ...miniappAm },
};

const STORAGE_KEY = "bunna.language";

/** Telegram tells us the person's app language; Amharic users get Amharic. */
function telegramLanguage(): Language {
  try {
    const code = retrieveLaunchParams().tgWebAppData?.user?.language_code;
    return code?.startsWith("am") ? "am" : "en";
  } catch {
    return navigator.language?.startsWith("am") ? "am" : "en";
  }
}

type I18n = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: Key, values?: Record<string, string | number>) => string;
  /** "18th" or "18ኛ". */
  ordinal: (n: number) => string;
};

const I18nContext = createContext<I18n | null>(null);

function englishOrdinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(telegramLanguage);

  useEffect(() => {
    void readFlag(STORAGE_KEY).then((stored) => {
      if (stored === "en" || stored === "am") setLanguageState(stored);
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    void writeFlag(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: Key, values?: Record<string, string | number>) => interpolate(tables[language][key], values),
    [language],
  );

  const ordinal = useCallback((n: number) => (language === "am" ? `${n}ኛ` : englishOrdinal(n)), [language]);

  const value = useMemo(() => ({ language, setLanguage, t, ordinal }), [language, setLanguage, t, ordinal]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const i18n = use(I18nContext);
  if (!i18n) throw new Error("useI18n must be used inside <I18nProvider>");
  return i18n;
}
