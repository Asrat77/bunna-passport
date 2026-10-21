import { mdiShuffle } from "@mdi/js";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { useMyDoodle } from "@/data/me";
import { Doodle } from "@/design/doodle/Doodle";
import { shuffleSeeds } from "@/design/doodle/generate";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { hapticSelection, hapticSuccess } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import "./studio.css";

/**
 * Doodle studio: your face in both moods, eight candidates, Shuffle for eight
 * more (`{base}-{n}`), and "Use this doodle" saves avatar_seed.
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
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState(current.seed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const options = shuffleSeeds(base, round);
  if (round === 0 && !options.includes(current.seed)) options[0] = current.seed;

  async function save() {
    setSaving(true);
    setError(false);
    try {
      const { data } = await api.updateProfile({ avatar_seed: picked });
      queryClient.setQueryData(["profile"], data);
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      hapticSuccess();
      back();
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  return (
    <main className="screen screen--glow studio">
      <BackControl onBack={back} label={t("common.back")} />
      <div className="studio__intro">
        <Headline first={t("studio.title")} second={t("studio.titleB")} />
        <p className="muted">{t("studio.body")}</p>
      </div>

      <div className="studio__moods">
        <div className="card studio__mood">
          <Doodle seed={picked} mood="sleepy" size={124} label={t("doodle.mineSleepy")} />
          <span className="studio__mood-title">{t("studio.before")}</span>
          <span className="studio__mood-meta mono">{t("studio.noCupYet")}</span>
        </div>
        <div className="card studio__mood studio__mood--awake">
          <Doodle seed={picked} mood="awake" size={124} label={t("doodle.mineAwake")} />
          <span className="studio__mood-title">{t("studio.after")}</span>
          <span className="studio__mood-meta mono">{t("studio.afterCheckIn")}</span>
        </div>
      </div>

      <div className="section-head">
        <h2 className="section-title">{t("studio.pickAnother")}</h2>
        <button type="button" className="pill-button" onClick={() => setRound((r) => r + 1)}>
          <Icon path={mdiShuffle} size={17} />
          {t("studio.shuffle")}
        </button>
      </div>

      <div className="studio__grid" role="radiogroup" aria-label={t("studio.pickAnother")}>
        {options.map((seed, index) => (
          <button
            key={seed}
            type="button"
            role="radio"
            aria-checked={seed === picked}
            aria-label={t("studio.option", { number: index + 1 })}
            className="studio__option"
            onClick={() => {
              hapticSelection();
              setPicked(seed);
            }}
          >
            <Doodle seed={seed} mood="awake" size={62} background="none" decorative />
          </button>
        ))}
      </div>

      {error ? <p className="notice notice--caution">{t("common.somethingWrong")}</p> : null}
      <p className="studio__footnote">{t("studio.footnote")}</p>
      <PrimaryAction text={t("studio.use")} onClick={() => void save()} loading={saving} disabled={picked === current.seed} />
    </main>
  );
}
