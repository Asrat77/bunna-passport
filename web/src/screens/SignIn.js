import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { phEye, phEyeSlash } from "@/ui/icons";
import { useState } from "react";
import { ApiRequestError } from "@/api/errors";
import { useAuth } from "@/auth/AuthProvider";
import { Doodle } from "@/design/doodle/Doodle";
import { useI18n } from "@/i18n/context";
import { PrimaryAction } from "@/telegram/buttons";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import "./signin.css";
/**
 * The plain website's way in (handoff, Sign-in fallback). Inside Telegram
 * nobody sees this: initData signs them in before the first screen.
 */
export function SignIn() {
    const { t } = useI18n();
    const { signInWithEmail } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [reveal, setReveal] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const ready = email.trim().length > 0 && password.length > 0;
    async function submit(event) {
        event?.preventDefault();
        if (!ready || busy)
            return;
        setBusy(true);
        setError(null);
        try {
            await signInWithEmail(email.trim(), password);
        }
        catch (failure) {
            setError(t(failure instanceof ApiRequestError && failure.isUnauthorized ? "auth.invalid" : "common.somethingWrong"));
            setBusy(false);
        }
    }
    return (_jsxs("main", { className: "screen screen--glow signin", children: [_jsx("div", { className: "signin__doodle", "aria-hidden": "true", children: _jsx(Doodle, { seed: "bunna", mood: "sleepy", size: 96, decorative: true }) }), _jsx(Headline, { first: t("signin.title"), second: t("signin.titleB"), size: 34 }), _jsx("p", { className: "signin__body", children: t("signin.body") }), _jsxs("form", { className: "signin__form", onSubmit: submit, noValidate: true, children: [_jsxs("label", { className: "field", children: [_jsx("span", { className: "field__label", children: t("auth.email") }), _jsx("input", { type: "email", autoComplete: "email", inputMode: "email", value: email, onChange: (event) => setEmail(event.target.value) })] }), _jsxs("label", { className: "field", children: [_jsx("span", { className: "field__label", children: t("auth.password") }), _jsxs("span", { className: "field__row", children: [_jsx("input", { type: reveal ? "text" : "password", autoComplete: "current-password", value: password, onChange: (event) => setPassword(event.target.value) }), _jsx("button", { type: "button", className: "field__reveal", "aria-label": t(reveal ? "auth.hidePassword" : "auth.showPassword"), onClick: () => setReveal(!reveal), children: _jsx(Icon, { path: reveal ? phEyeSlash : phEye, size: 20 }) })] })] }), error ? (_jsx("p", { className: "signin__error", role: "alert", children: error })) : null, _jsx("button", { type: "submit", hidden: true })] }), _jsx(PrimaryAction, { text: t("auth.signIn"), onClick: () => void submit(), disabled: !ready, loading: busy })] }));
}
