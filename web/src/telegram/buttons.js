import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { backButton, mainButton, secondaryButton, useSignal, } from "@telegram-apps/sdk-react";
import { useEffect, useRef } from "react";
import { mochaPalette, palette } from "@/design/palette";
import { useScheme } from "./theme";
import "./buttons.css";
/** Keeps the latest handler without re-subscribing on every render. */
function useLatest(value) {
    const ref = useRef(value);
    ref.current = value;
    return ref;
}
/**
 * The screen's main action. Inside Telegram it drives the native
 * BottomButton; in older clients and the plain website it falls back to the
 * 56px in-page button drawn on the canvas.
 */
export function PrimaryAction({ text, onClick, disabled = false, loading = false, mocha = false }) {
    const scheme = useScheme();
    const native = useSignal(mainButton.setParams.isAvailable);
    const handler = useLatest(onClick);
    useEffect(() => {
        if (!native)
            return;
        const { action, onAction } = mocha ? mochaPalette : palette[scheme];
        mainButton.setParams({
            text,
            backgroundColor: action,
            textColor: onAction,
            isVisible: true,
            isEnabled: !disabled,
            isLoaderVisible: loading,
        });
    }, [native, scheme, mocha, text, disabled, loading]);
    useEffect(() => {
        if (!native)
            return;
        const off = mainButton.onClick(() => handler.current());
        return () => {
            off();
            mainButton.setParams({ isVisible: false, isLoaderVisible: false });
        };
    }, [native, handler]);
    if (native)
        return null;
    return (_jsx("div", { className: "action-bar", children: _jsxs("button", { type: "button", className: "action action--primary", onClick: onClick, disabled: disabled || loading, "aria-busy": loading || undefined, children: [loading ? _jsx("span", { className: "action__spinner", "aria-hidden": "true" }) : null, text] }) }));
}
/**
 * A second action beside the main one, such as "Share card" on the ceremony.
 * Uses Telegram's SecondaryButton from Bot API 7.10, otherwise an in-page
 * outlined button.
 */
export function SecondaryAction({ text, onClick, disabled = false, loading = false }) {
    const native = useSignal(secondaryButton.setParams.isAvailable);
    const handler = useLatest(onClick);
    useEffect(() => {
        if (!native)
            return;
        secondaryButton.setParams({
            text,
            isVisible: true,
            isEnabled: !disabled,
            isLoaderVisible: loading,
            position: "left",
        });
    }, [native, text, disabled, loading]);
    useEffect(() => {
        if (!native)
            return;
        const off = secondaryButton.onClick(() => handler.current());
        return () => {
            off();
            secondaryButton.setParams({ isVisible: false, isLoaderVisible: false });
        };
    }, [native, handler]);
    if (native)
        return null;
    return (_jsx("div", { className: "action-bar action-bar--secondary", children: _jsx("button", { type: "button", className: "action action--secondary", onClick: onClick, disabled: disabled || loading, children: text }) }));
}
/**
 * Telegram's BackButton for pushed screens. Outside Telegram, renders a small
 * in-page back control since there is no header to put it in.
 */
export function BackControl({ onBack, label }) {
    const native = useSignal(backButton.show.isAvailable);
    const handler = useLatest(onBack);
    useEffect(() => {
        if (!native)
            return;
        backButton.show();
        const off = backButton.onClick(() => handler.current());
        return () => {
            off();
            backButton.hide();
        };
    }, [native, handler]);
    if (native)
        return null;
    return (_jsxs("button", { type: "button", className: "back-control", onClick: onBack, children: [_jsx("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: _jsx("path", { d: "M15 5l-7 7 7 7" }) }), label] }));
}
