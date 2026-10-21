import {
  backButton,
  mainButton,
  secondaryButton,
  useSignal,
} from "@telegram-apps/sdk-react";
import { useEffect, useRef } from "react";
import { palette } from "@/design/palette";
import { useScheme } from "./theme";
import "./buttons.css";

type ActionProps = {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
};

/** Keeps the latest handler without re-subscribing on every render. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/**
 * The screen's main action. Inside Telegram it drives the native
 * BottomButton; in older clients and the plain website it falls back to the
 * 56px in-page button drawn on the canvas.
 */
export function PrimaryAction({ text, onClick, disabled = false, loading = false }: ActionProps) {
  const scheme = useScheme();
  const native = useSignal(mainButton.setParams.isAvailable);
  const handler = useLatest(onClick);

  useEffect(() => {
    if (!native) return;
    const { primary, onPrimary } = palette[scheme];
    mainButton.setParams({
      text,
      backgroundColor: primary,
      textColor: onPrimary,
      isVisible: true,
      isEnabled: !disabled,
      isLoaderVisible: loading,
    });
  }, [native, scheme, text, disabled, loading]);

  useEffect(() => {
    if (!native) return;
    const off = mainButton.onClick(() => handler.current());
    return () => {
      off();
      mainButton.setParams({ isVisible: false, isLoaderVisible: false });
    };
  }, [native, handler]);

  if (native) return null;
  return (
    <div className="action-bar">
      <button
        type="button"
        className="action action--primary"
        onClick={onClick}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
      >
        {loading ? <span className="action__spinner" aria-hidden="true" /> : null}
        {text}
      </button>
    </div>
  );
}

/**
 * A second action beside the main one, such as "Share card" on the ceremony.
 * Uses Telegram's SecondaryButton from Bot API 7.10, otherwise an in-page
 * outlined button.
 */
export function SecondaryAction({ text, onClick, disabled = false, loading = false }: ActionProps) {
  const native = useSignal(secondaryButton.setParams.isAvailable);
  const handler = useLatest(onClick);

  useEffect(() => {
    if (!native) return;
    secondaryButton.setParams({
      text,
      isVisible: true,
      isEnabled: !disabled,
      isLoaderVisible: loading,
      position: "left",
    });
  }, [native, text, disabled, loading]);

  useEffect(() => {
    if (!native) return;
    const off = secondaryButton.onClick(() => handler.current());
    return () => {
      off();
      secondaryButton.setParams({ isVisible: false, isLoaderVisible: false });
    };
  }, [native, handler]);

  if (native) return null;
  return (
    <div className="action-bar action-bar--secondary">
      <button
        type="button"
        className="action action--secondary"
        onClick={onClick}
        disabled={disabled || loading}
      >
        {text}
      </button>
    </div>
  );
}

/**
 * Telegram's BackButton for pushed screens. Outside Telegram, renders a small
 * in-page back control since there is no header to put it in.
 */
export function BackControl({ onBack, label }: { onBack: () => void; label: string }) {
  const native = useSignal(backButton.show.isAvailable);
  const handler = useLatest(onBack);

  useEffect(() => {
    if (!native) return;
    backButton.show();
    const off = backButton.onClick(() => handler.current());
    return () => {
      off();
      backButton.hide();
    };
  }, [native, handler]);

  if (native) return null;
  return (
    <button type="button" className="back-control" onClick={onBack}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {label}
    </button>
  );
}
