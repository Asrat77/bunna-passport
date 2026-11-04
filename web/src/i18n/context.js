import { jsx as _jsx } from "react/jsx-runtime";
import { retrieveLaunchParams } from "@telegram-apps/sdk-react";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { readFlag, writeFlag } from "@/telegram/storage";
import { miniappAm, miniappEn } from "./miniapp";
import { catalogs, interpolate } from "./strings";
const tables = {
    en: { ...catalogs.en, ...miniappEn },
    am: { ...catalogs.am, ...miniappAm },
};
const STORAGE_KEY = "bunna.language";
/** Telegram tells us the person's app language; Amharic users get Amharic. */
function telegramLanguage() {
    try {
        const code = retrieveLaunchParams().tgWebAppData?.user?.language_code;
        return code?.startsWith("am") ? "am" : "en";
    }
    catch {
        return navigator.language?.startsWith("am") ? "am" : "en";
    }
}
const I18nContext = createContext(null);
function englishOrdinal(n) {
    const teen = n % 100 >= 11 && n % 100 <= 13;
    const suffix = teen ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
    return `${n}${suffix}`;
}
export function I18nProvider({ children }) {
    const [language, setLanguageState] = useState(telegramLanguage);
    useEffect(() => {
        void readFlag(STORAGE_KEY).then((stored) => {
            if (stored === "en" || stored === "am")
                setLanguageState(stored);
        });
    }, []);
    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);
    const setLanguage = useCallback((next) => {
        setLanguageState(next);
        void writeFlag(STORAGE_KEY, next);
    }, []);
    const t = useCallback((key, values) => interpolate(tables[language][key], values), [language]);
    const ordinal = useCallback((n) => (language === "am" ? `${n}ኛ` : englishOrdinal(n)), [language]);
    const value = useMemo(() => ({ language, setLanguage, t, ordinal }), [language, setLanguage, t, ordinal]);
    return _jsx(I18nContext, { value: value, children: children });
}
export function useI18n() {
    const i18n = use(I18nContext);
    if (!i18n)
        throw new Error("useI18n must be used inside <I18nProvider>");
    return i18n;
}
