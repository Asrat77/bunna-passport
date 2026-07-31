import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { catalogs, interpolate, type Language, type StringKey } from "./strings";

const STORAGE_KEY = "bunna.language";

type I18n = {
  language: Language;
  /** Null until the stored choice has been read — gates the first-run screen. */
  chosen: boolean;
  ready: boolean;
  setLanguage: (language: Language) => void;
  t: (key: StringKey, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [chosen, setChosen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === "en" || stored === "am") {
          setLanguageState(stored);
          setChosen(true);
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    setChosen(true);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: StringKey, values?: Record<string, string | number>) =>
      interpolate(catalogs[language][key], values),
    [language],
  );

  const value = useMemo(
    () => ({ language, chosen, ready, setLanguage, t }),
    [language, chosen, ready, setLanguage, t],
  );

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const i18n = use(I18nContext);
  if (!i18n) throw new Error("useI18n must be used inside <I18nProvider>");
  return i18n;
}
