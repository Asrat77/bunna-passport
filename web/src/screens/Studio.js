import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { phShuffle } from "@/ui/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useMyDoodle } from "@/data/me";
import { Doodle } from "@/design/doodle/Doodle";
import { generateDoodle, shuffleSeeds } from "@/design/doodle/generate";
import { EYE_COLORS, HAIR_COLORS, SKIN_COLORS, TRAIT_OPTIONS } from "@/design/doodle/traits";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { hapticSelection, hapticSuccess } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import "./studio.css";
const TABS = ["face", "skin", "hair", "eyes", "extras"];
const pencil = (value) => value === "paper" || value === "graphite";
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
// Emil Kowalski's strong ease-out, for anything responding to a tap.
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
/**
 * The profile picture editor: one big face, before or after coffee, and the
 * parts to change underneath, a tab at a time. Every option is drawn on your
 * own face, so you see the change before you make it. "Save" stores the seed
 * (the face shape) and every trait, so friends see exactly this face.
 */
export function Studio() {
    const { t } = useI18n();
    const { back } = useNavigation();
    const { telegramId, user } = useAuth();
    const queryClient = useQueryClient();
    const current = useMyDoodle();
    // Shuffles start from the person's own default, not from a picked seed,
    // so the candidates don't drift further away with every choice.
    const base = telegramId ?? String(user?.id ?? current.seed);
    const initial = useMemo(() => ({ seed: current.seed, traits: generateDoodle(current.seed, "awake", current.traits).traits }), [current.seed, current.traits]);
    const [draft, setDraft] = useState(initial);
    const [tab, setTab] = useState("face");
    const [direction, setDirection] = useState("forward");
    const [mood, setMood] = useState("awake");
    const [round, setRound] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);
    const dirty = draft.seed !== initial.seed || JSON.stringify(draft.traits) !== JSON.stringify(initial.traits);
    const seeds = shuffleSeeds(base, round);
    if (round === 0 && !seeds.includes(initial.seed))
        seeds[0] = initial.seed;
    function pick(trait, value) {
        if (draft.traits[trait] === value)
            return;
        hapticSelection();
        // Picking a hair style means wanting to see it, so a hat comes off.
        const hatOff = trait === "hair" ? { hat: "none" } : {};
        setDraft((d) => ({ ...d, traits: { ...d.traits, ...hatOff, [trait]: value } }));
    }
    function pickSeed(seed) {
        if (draft.seed === seed)
            return;
        hapticSelection();
        setDraft((d) => ({ ...d, seed }));
    }
    function openTab(next) {
        if (next === tab)
            return;
        hapticSelection();
        setDirection(TABS.indexOf(next) > TABS.indexOf(tab) ? "forward" : "back");
        setTab(next);
    }
    async function save() {
        setSaving(true);
        setError(false);
        try {
            const { data } = await api.updateProfile({ avatar_seed: draft.seed, avatar_traits: draft.traits });
            queryClient.setQueryData(["profile"], data);
            void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
            void queryClient.invalidateQueries({ queryKey: ["friends"] });
            hapticSuccess();
            back();
        }
        catch {
            setError(true);
            setSaving(false);
        }
    }
    const sections = {
        skin: [{ trait: "skin", title: t("studio.skinTone"), colors: SKIN_COLORS }],
        hair: [
            { trait: "hair", title: t("studio.hairStyle"), crop: "top" },
            { trait: "hair_color", title: t("studio.colour"), colors: HAIR_COLORS },
        ],
        eyes: [
            { trait: "eyes", title: t("studio.eyeShape"), crop: "eyes" },
            { trait: "eye_color", title: t("studio.colour"), colors: EYE_COLORS },
        ],
        extras: [
            { trait: "glasses", title: t("studio.glasses"), crop: "eyes" },
            { trait: "hat", title: t("studio.hat"), crop: "top" },
            { trait: "headphones", title: t("studio.headphones") },
            { trait: "earrings", title: t("studio.earrings"), crop: "lower" },
        ],
    };
    return (_jsxs("main", { className: "screen mocha studio", children: [_jsx(BackControl, { onBack: back, label: t("common.back") }), _jsxs("div", { className: "studio__intro", children: [_jsx(Headline, { first: t("studio.title"), second: t("studio.titleB") }), _jsx("p", { className: "muted", children: t("studio.body") })] }), _jsx(Stage, { draft: draft, mood: mood }), _jsx("div", { className: "studio__moods", role: "radiogroup", "aria-label": t("studio.preview"), children: ["sleepy", "awake"].map((m) => (_jsx("button", { type: "button", role: "radio", "aria-checked": mood === m, className: "studio__mood", onClick: () => {
                        if (mood !== m)
                            hapticSelection();
                        setMood(m);
                    }, children: t(m === "sleepy" ? "studio.before" : "studio.after") }, m))) }), _jsx(Tabs, { tab: tab, onChange: openTab }), _jsx("div", { className: "studio__panel", "data-direction": direction, role: "tabpanel", id: `studio-panel-${tab}`, "aria-labelledby": `studio-tab-${tab}`, children: tab === "face" ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "studio__section", children: [_jsxs("div", { className: "section-head", children: [_jsx("h2", { className: "studio__section-title", children: t("studio.faceShape") }), _jsxs("button", { type: "button", className: "pill-button studio__shuffle", onClick: () => {
                                                hapticSelection();
                                                setRound((r) => r + 1);
                                            }, children: [_jsx(Icon, { path: phShuffle, size: 17 }), t("studio.shuffle")] })] }), _jsx("div", { className: "studio__grid", role: "radiogroup", "aria-label": t("studio.faceShape"), children: seeds.map((seed, index) => (_jsx("button", { type: "button", role: "radio", "aria-checked": seed === draft.seed, "aria-label": t("studio.option", { number: index + 1 }), className: "studio__tile", onClick: () => pickSeed(seed), children: _jsx(Doodle, { seed: seed, traits: draft.traits, mood: "awake", size: 64, background: "none", rough: false, decorative: true }) }, seed))) })] }), _jsx(Choices, { section: { trait: "nose", title: t("studio.nose"), crop: "eyes" }, draft: draft, onPick: pick }), _jsx(Choices, { section: { trait: "facial_hair", title: t("studio.facialHair"), crop: "lower" }, draft: draft, onPick: pick }), _jsx(Choices, { section: { trait: "freckles", title: t("studio.freckles"), crop: "eyes" }, draft: draft, onPick: pick })] })) : (sections[tab].map((section) => _jsx(Choices, { section: section, draft: draft, onPick: pick }, section.trait))) }, tab), error ? _jsx("p", { className: "notice notice--caution", children: t("common.somethingWrong") }) : null, _jsx("p", { className: "studio__footnote", children: t("studio.footnote") }), _jsx(PrimaryAction, { text: t("studio.use"), onClick: () => void save(), loading: saving, disabled: !dirty, mocha: true })] }));
}
/**
 * The big face. Each change lands with a small settle (scale and a breath of
 * blur, 220ms ease-out) so the eye catches what moved; the mood toggle
 * crossfades between the two faces instead.
 */
function Stage({ draft, mood }) {
    const { t } = useI18n();
    const ref = useRef(null);
    const key = `${draft.seed}|${JSON.stringify(draft.traits)}`;
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const el = ref.current;
        if (!el?.animate)
            return;
        const frames = reducedMotion()
            ? [{ opacity: 0.6 }, { opacity: 1 }]
            : [
                { transform: "scale(0.965)", filter: "blur(1.5px)" },
                { transform: "scale(1)", filter: "blur(0px)" },
            ];
        el.animate(frames, { duration: 220, easing: EASE_OUT });
    }, [key]);
    return (_jsx("div", { className: "studio__stage", children: _jsxs("div", { className: "studio__face", ref: ref, "data-mood": mood, children: [_jsx("span", { className: "studio__face-layer studio__face-layer--sleepy", "aria-hidden": mood !== "sleepy", children: _jsx(Doodle, { seed: draft.seed, traits: draft.traits, mood: "sleepy", size: 168, label: t("doodle.mineSleepy") }) }), _jsx("span", { className: "studio__face-layer studio__face-layer--awake", "aria-hidden": mood !== "awake", children: _jsx(Doodle, { seed: draft.seed, traits: draft.traits, mood: "awake", size: 168, label: t("doodle.mineAwake") }) })] }) }));
}
/**
 * Five equal tabs. The selected look is a second copy of the row clipped to
 * the active tab, and the clip slides between tabs, so the label colour and
 * the pill change together (Emil Kowalski's clip-path tabs).
 */
function Tabs({ tab, onChange }) {
    const { t } = useI18n();
    const index = TABS.indexOf(tab);
    const share = 100 / TABS.length;
    const clip = `inset(0 ${(TABS.length - 1 - index) * share}% 0 ${index * share}% round 999px)`;
    const label = (name) => t(`studio.tab.${name}`);
    return (_jsxs("div", { className: "studio__tabs", children: [_jsx("div", { className: "studio__tab-row", role: "tablist", "aria-label": t("studio.parts"), children: TABS.map((name) => (_jsx("button", { type: "button", role: "tab", id: `studio-tab-${name}`, "aria-selected": tab === name, "aria-controls": `studio-panel-${name}`, className: "studio__tab", onClick: () => onChange(name), children: label(name) }, name))) }), _jsx("div", { className: "studio__tab-row studio__tab-row--active", "aria-hidden": "true", style: { clipPath: clip }, children: TABS.map((name) => (_jsx("span", { className: "studio__tab", children: label(name) }, name))) })] }));
}
function Choices({ section, draft, onPick, }) {
    const { t } = useI18n();
    const { trait, title, crop, colors } = section;
    const options = TRAIT_OPTIONS[trait];
    const name = (value) => t(`avatar.${trait}.${value}`);
    // Hair styles are shown without a hat over them, or every tile would look the same.
    const preview = (key, value) => key === "hair" ? { ...draft.traits, hair: value, hat: "none", headphones: "none" } : { ...draft.traits, [key]: value };
    return (_jsxs("div", { className: "studio__section", children: [_jsx("h2", { className: "studio__section-title", children: title }), _jsx("div", { className: colors ? "studio__swatches" : `studio__grid${options.length % 3 === 0 && options.length % 4 !== 0 ? " studio__grid--three" : ""}`, role: "radiogroup", "aria-label": title, children: options.map((value) => {
                    const selected = draft.traits[trait] === value;
                    const fill = colors?.[value];
                    return (_jsx("button", { type: "button", role: "radio", "aria-checked": selected, "aria-label": name(value), className: colors ? "studio__swatch" : "studio__tile", onClick: () => onPick(trait, value), children: colors ? (pencil(value) ? (_jsx("span", { className: "studio__swatch-fill studio__swatch-fill--pencil" })) : (_jsx("span", { className: "studio__swatch-fill", style: { background: fill } }))) : (_jsx(Doodle, { seed: draft.seed, traits: preview(trait, value), mood: "awake", size: 64, background: "none", rough: false, crop: crop, decorative: true })) }, value));
                }) })] }));
}
