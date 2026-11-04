import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { phPencilSimple } from "@/ui/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useMyDoodle } from "@/data/me";
import { useProfile } from "@/data/queries";
import { Doodle } from "@/design/doodle/Doodle";
import { useI18n } from "@/i18n/context";
import { languageNames } from "@/i18n/strings";
import { useNavigation } from "@/nav/Navigation";
import { BackControl } from "@/telegram/buttons";
import { inTelegram } from "@/telegram/sdk";
import { Icon } from "@/ui/Icon";
import { handleLine } from "../passport/Passport";
import "./profile.css";
/**
 * Profile, opened from your doodle on the Passport header: who you are, your
 * doodle, and every setting the Mini App has, kept together in one card.
 */
export function Profile() {
    const { t, language } = useI18n();
    const { back, push } = useNavigation();
    const { firstName } = useAuth();
    const { data: profile } = useProfile();
    const doodle = useMyDoodle();
    return (_jsxs("main", { className: "screen screen--glow profile", children: [_jsx(BackControl, { onBack: back, label: t("common.back") }), _jsxs("header", { className: "profile__header", children: [_jsx(Doodle, { seed: doodle.seed, traits: doodle.traits, mood: doodle.awake ? "awake" : "sleepy", size: 96, label: t(doodle.awake ? "doodle.mineAwake" : "doodle.mineSleepy") }), _jsx("h1", { className: "profile__name", children: profile?.display_name ?? firstName ?? "" }), profile ? _jsx("span", { className: "profile__handle", children: handleLine(profile, t, language) }) : null, _jsxs("button", { type: "button", className: "pill-button", onClick: () => push({ name: "studio" }), children: [_jsx(Icon, { path: phPencilSimple, size: 16 }), t("passport.editDoodle")] })] }), _jsx(Settings, { profile: profile })] }));
}
/** Language, what friends can see of you, the bot's nudge, and signing out. */
function Settings({ profile }) {
    const { t, language, setLanguage } = useI18n();
    const { signOut } = useAuth();
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState(false);
    async function toggleSharing(change) {
        setSaving(true);
        try {
            const { data } = await api.updateProfile(change);
            queryClient.setQueryData(["profile"], data);
            void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
        }
        finally {
            setSaving(false);
        }
    }
    async function toggleNudges(next) {
        setSaving(true);
        try {
            const { data } = await api.updateProfile({ daily_nudges: next });
            queryClient.setQueryData(["profile"], data);
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsxs("section", { className: "card settings", "aria-labelledby": "settings-title", children: [_jsx("h2", { id: "settings-title", className: "eyebrow", children: t("passport.settings") }), _jsxs("div", { className: "settings__row", children: [_jsx("span", { children: t("passport.language") }), _jsx("div", { className: "segment", role: "group", "aria-label": t("passport.language"), children: ["en", "am"].map((code) => (_jsx("button", { type: "button", "aria-pressed": language === code, onClick: () => setLanguage(code), lang: code, children: languageNames[code] }, code))) })] }), profile ? (_jsxs("label", { className: "settings__row settings__toggle", children: [_jsxs("span", { className: "settings__text", children: [t("passport.shareCupStatus"), _jsx("span", { className: "muted", children: t("passport.shareCupStatusHint") })] }), _jsx("input", { type: "checkbox", role: "switch", checked: profile.shares_cup_status, disabled: saving, onChange: (event) => void toggleSharing({ shares_cup_status: event.target.checked }) })] })) : null, profile ? (_jsxs("label", { className: "settings__row settings__toggle", children: [_jsxs("span", { className: "settings__text", children: [t("passport.shareVisits"), _jsx("span", { className: "muted", children: t("passport.shareVisitsHint") })] }), _jsx("input", { type: "checkbox", role: "switch", checked: profile.shares_visits, disabled: saving, onChange: (event) => void toggleSharing({ shares_visits: event.target.checked }) })] })) : null, profile && inTelegram ? (_jsxs("label", { className: "settings__row settings__toggle", children: [_jsxs("span", { className: "settings__text", children: [t("passport.dailyNudges"), _jsx("span", { className: "muted", children: t("passport.dailyNudgesHint") })] }), _jsx("input", { type: "checkbox", role: "switch", checked: profile.daily_nudges, disabled: saving, onChange: (event) => void toggleNudges(event.target.checked) })] })) : null, inTelegram ? null : (_jsx("button", { type: "button", className: "link-button", onClick: () => void signOut(), children: t("profile.signOut") }))] }));
}
