import { phShuffle } from "@/ui/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useMyDoodle } from "@/data/me";
import { Doodle, type DoodleCrop } from "@/design/doodle/Doodle";
import { generateDoodle, shuffleSeeds, type Mood } from "@/design/doodle/generate";
import { EYE_COLORS, HAIR_COLORS, SKIN_COLORS, TRAIT_OPTIONS, type AvatarTraits, type TraitKey } from "@/design/doodle/traits";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { hapticSelection, hapticSuccess } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import "./studio.css";

type Tab = "face" | "skin" | "hair" | "eyes" | "extras";
const TABS: Tab[] = ["face", "skin", "hair", "eyes", "extras"];

type Draft = { seed: string; traits: AvatarTraits };

/** One row of choices: drawn faces (with a close-up) or colour swatches. */
type Section = { trait: TraitKey; title: string; crop?: DoodleCrop; colors?: Record<string, string> };

const pencil = (value: string) => value === "paper" || value === "graphite";

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

  const initial = useMemo<Draft>(
    () => ({ seed: current.seed, traits: generateDoodle(current.seed, "awake", current.traits).traits }),
    [current.seed, current.traits],
  );
  const [draft, setDraft] = useState<Draft>(initial);
  const [tab, setTab] = useState<Tab>("face");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [mood, setMood] = useState<Mood>("awake");
  const [round, setRound] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const dirty = draft.seed !== initial.seed || JSON.stringify(draft.traits) !== JSON.stringify(initial.traits);

  const seeds = shuffleSeeds(base, round);
  if (round === 0 && !seeds.includes(initial.seed)) seeds[0] = initial.seed;

  function pick<K extends TraitKey>(trait: K, value: AvatarTraits[K]) {
    if (draft.traits[trait] === value) return;
    hapticSelection();
    // Picking a hair style means wanting to see it, so a hat comes off.
    const hatOff = trait === "hair" ? { hat: "none" } : {};
    setDraft((d) => ({ ...d, traits: { ...d.traits, ...hatOff, [trait]: value } }));
  }

  function pickSeed(seed: string) {
    if (draft.seed === seed) return;
    hapticSelection();
    setDraft((d) => ({ ...d, seed }));
  }

  function openTab(next: Tab) {
    if (next === tab) return;
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
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  const sections: Record<Exclude<Tab, "face">, Section[]> = {
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

  return (
    <main className="screen mocha studio">
      <BackControl onBack={back} label={t("common.back")} />
      <div className="studio__intro">
        <Headline first={t("studio.title")} second={t("studio.titleB")} />
        <p className="muted">{t("studio.body")}</p>
      </div>

      <Stage draft={draft} mood={mood} />

      <div className="studio__moods" role="radiogroup" aria-label={t("studio.preview")}>
        {(["sleepy", "awake"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mood === m}
            className="studio__mood"
            onClick={() => {
              if (mood !== m) hapticSelection();
              setMood(m);
            }}
          >
            {t(m === "sleepy" ? "studio.before" : "studio.after")}
          </button>
        ))}
      </div>

      <Tabs tab={tab} onChange={openTab} />

      <div className="studio__panel" key={tab} data-direction={direction} role="tabpanel" id={`studio-panel-${tab}`} aria-labelledby={`studio-tab-${tab}`}>
        {tab === "face" ? (
          <>
            <div className="studio__section">
              <div className="section-head">
                <h2 className="studio__section-title">{t("studio.faceShape")}</h2>
                <button
                  type="button"
                  className="pill-button studio__shuffle"
                  onClick={() => {
                    hapticSelection();
                    setRound((r) => r + 1);
                  }}
                >
                  <Icon path={phShuffle} size={17} />
                  {t("studio.shuffle")}
                </button>
              </div>
              <div className="studio__grid" role="radiogroup" aria-label={t("studio.faceShape")}>
                {seeds.map((seed, index) => (
                  <button
                    key={seed}
                    type="button"
                    role="radio"
                    aria-checked={seed === draft.seed}
                    aria-label={t("studio.option", { number: index + 1 })}
                    className="studio__tile"
                    onClick={() => pickSeed(seed)}
                  >
                    <Doodle seed={seed} traits={draft.traits} mood="awake" size={64} background="none" rough={false} decorative />
                  </button>
                ))}
              </div>
            </div>
            <Choices section={{ trait: "nose", title: t("studio.nose"), crop: "eyes" }} draft={draft} onPick={pick} />
            <Choices section={{ trait: "facial_hair", title: t("studio.facialHair"), crop: "lower" }} draft={draft} onPick={pick} />
            <Choices section={{ trait: "freckles", title: t("studio.freckles"), crop: "eyes" }} draft={draft} onPick={pick} />
          </>
        ) : (
          sections[tab].map((section) => <Choices key={section.trait} section={section} draft={draft} onPick={pick} />)
        )}
      </div>

      {error ? <p className="notice notice--caution">{t("common.somethingWrong")}</p> : null}
      <p className="studio__footnote">{t("studio.footnote")}</p>
      <PrimaryAction text={t("studio.use")} onClick={() => void save()} loading={saving} disabled={!dirty} mocha />
    </main>
  );
}

/**
 * The big face. Each change lands with a small settle (scale and a breath of
 * blur, 220ms ease-out) so the eye catches what moved; the mood toggle
 * crossfades between the two faces instead.
 */
function Stage({ draft, mood }: { draft: Draft; mood: Mood }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const key = `${draft.seed}|${JSON.stringify(draft.traits)}`;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el?.animate) return;
    const frames = reducedMotion()
      ? [{ opacity: 0.6 }, { opacity: 1 }]
      : [
          { transform: "scale(0.965)", filter: "blur(1.5px)" },
          { transform: "scale(1)", filter: "blur(0px)" },
        ];
    el.animate(frames, { duration: 220, easing: EASE_OUT });
  }, [key]);

  return (
    <div className="studio__stage">
      <div className="studio__face" ref={ref} data-mood={mood}>
        <span className="studio__face-layer studio__face-layer--sleepy" aria-hidden={mood !== "sleepy"}>
          <Doodle seed={draft.seed} traits={draft.traits} mood="sleepy" size={168} label={t("doodle.mineSleepy")} />
        </span>
        <span className="studio__face-layer studio__face-layer--awake" aria-hidden={mood !== "awake"}>
          <Doodle seed={draft.seed} traits={draft.traits} mood="awake" size={168} label={t("doodle.mineAwake")} />
        </span>
      </div>
    </div>
  );
}

/**
 * Five equal tabs. The selected look is a second copy of the row clipped to
 * the active tab, and the clip slides between tabs, so the label colour and
 * the pill change together (Emil Kowalski's clip-path tabs).
 */
function Tabs({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const { t } = useI18n();
  const index = TABS.indexOf(tab);
  const share = 100 / TABS.length;
  const clip = `inset(0 ${(TABS.length - 1 - index) * share}% 0 ${index * share}% round 999px)`;
  const label = (name: Tab) => t(`studio.tab.${name}` as "studio.tab.face");

  return (
    <div className="studio__tabs">
      <div className="studio__tab-row" role="tablist" aria-label={t("studio.parts")}>
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`studio-tab-${name}`}
            aria-selected={tab === name}
            aria-controls={`studio-panel-${name}`}
            className="studio__tab"
            onClick={() => onChange(name)}
          >
            {label(name)}
          </button>
        ))}
      </div>
      <div className="studio__tab-row studio__tab-row--active" aria-hidden="true" style={{ clipPath: clip }}>
        {TABS.map((name) => (
          <span key={name} className="studio__tab">
            {label(name)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Choices({
  section,
  draft,
  onPick,
}: {
  section: Section;
  draft: Draft;
  onPick: <K extends TraitKey>(trait: K, value: AvatarTraits[K]) => void;
}) {
  const { t } = useI18n();
  const { trait, title, crop, colors } = section;
  const options = TRAIT_OPTIONS[trait];
  const name = (value: string) => t(`avatar.${trait}.${value}` as "avatar.skin.paper");
  // Hair styles are shown without a hat over them, or every tile would look the same.
  const preview = (key: TraitKey, value: string): Partial<AvatarTraits> =>
    key === "hair" ? { ...draft.traits, hair: value, hat: "none", headphones: "none" } : { ...draft.traits, [key]: value };

  return (
    <div className="studio__section">
      <h2 className="studio__section-title">{title}</h2>
      <div
        className={colors ? "studio__swatches" : `studio__grid${options.length % 3 === 0 && options.length % 4 !== 0 ? " studio__grid--three" : ""}`}
        role="radiogroup"
        aria-label={title}
      >
        {options.map((value) => {
          const selected = draft.traits[trait] === value;
          const fill = colors?.[value];
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={name(value)}
              className={colors ? "studio__swatch" : "studio__tile"}
              onClick={() => onPick(trait, value)}
            >
              {colors ? (
                pencil(value) ? (
                  // The pencil originals have no colour of their own: graphite hatching on paper.
                  <span className="studio__swatch-fill studio__swatch-fill--pencil" />
                ) : (
                  <span className="studio__swatch-fill" style={{ background: fill }} />
                )
              ) : (
                <Doodle seed={draft.seed} traits={preview(trait, value)} mood="awake" size={64} background="none" rough={false} crop={crop} decorative />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
