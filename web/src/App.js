import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ApiRequestError } from "./api/errors";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { Doodle } from "./design/doodle/Doodle";
import { I18nProvider, useI18n } from "./i18n/context";
import { LocationProvider } from "./location/LocationProvider";
import { NavigationProvider, useNavigation } from "./nav/Navigation";
import { AllCafes } from "./screens/AllCafes";
import { Ceremony } from "./screens/Ceremony";
import { ShareCard } from "./screens/ShareCard";
import { CheckIn } from "./screens/checkin/CheckIn";
import { Explore } from "./screens/Explore";
import { Invite } from "./screens/Invite";
import { MapScreen } from "./screens/map/MapScreen";
import { Passport } from "./screens/passport/Passport";
import { Profile } from "./screens/profile/Profile";
import { Shop } from "./screens/Shop";
import { SignIn } from "./screens/SignIn";
import { Stats } from "./screens/Stats";
import { Studio } from "./screens/Studio";
import { Welcome } from "./screens/Welcome";
import { AddCafe } from "./screens/contribute/AddCafe";
import { ReportCafe } from "./screens/contribute/ReportCafe";
import { SuggestEdit } from "./screens/contribute/SuggestEdit";
import { setErrorScreen } from "./lib/errorReporting";
import { takeLaunchInvite } from "./lib/invite";
import { PrimaryAction } from "./telegram/buttons";
import { readFlag, writeFlag } from "./telegram/storage";
import { SchemeContext, useColorScheme } from "./telegram/theme";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { Headline } from "./ui/Headline";
import "./app.css";
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,
            // A 4xx won't fix itself; only retry the network.
            retry: (count, error) => count < 2 && !(error instanceof ApiRequestError && error.status < 500),
        },
    },
});
const WELCOMED = "bunna.welcomed";
export function App() {
    const scheme = useColorScheme();
    return (_jsx(SchemeContext, { value: scheme, children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(I18nProvider, { children: _jsx(ErrorBoundary, { fallback: _jsx(Crashed, {}), children: _jsx(AuthProvider, { children: _jsx(LocationProvider, { children: _jsx(Gate, {}) }) }) }) }) }) }));
}
/** First run, then sign-in, then the app (handoff, Flows). */
function Gate() {
    const { status } = useAuth();
    const [welcomed, setWelcomed] = useState(null);
    useEffect(() => {
        void readFlag(WELCOMED).then((value) => setWelcomed(value === "1"));
    }, []);
    if (welcomed === null)
        return _jsx(Launching, {});
    if (!welcomed) {
        return (_jsx(Welcome, { onDone: () => {
                setWelcomed(true);
                void writeFlag(WELCOMED, "1");
            } }));
    }
    if (status === "loading")
        return _jsx(Launching, {});
    if (status === "failed")
        return _jsx(LaunchFailed, {});
    if (status === "signedOut")
        return _jsx(SignIn, {});
    return (_jsx(NavigationProvider, { initial: { name: "explore" }, children: _jsx(Screens, {}) }));
}
function Screens() {
    const { route, push } = useNavigation();
    // Opened from a friend's invite link: ask about it over Explore.
    useEffect(() => {
        const token = takeLaunchInvite();
        if (token)
            push({ name: "invite", token });
    }, [push]);
    useEffect(() => {
        window.scrollTo(0, 0);
        setErrorScreen(route.name);
    }, [route]);
    switch (route.name) {
        case "explore":
            return _jsx(Explore, {});
        case "passport":
            return _jsx(Passport, {});
        case "stats":
            return _jsx(Stats, {});
        case "shop":
            return _jsx(Shop, { id: route.id }, route.id);
        case "checkin":
            return _jsx(CheckIn, { shopId: route.shopId });
        case "ceremony":
            return _jsx(Ceremony, { checkIn: route.checkIn, wasAwake: route.wasAwake });
        case "share":
            return _jsx(ShareCard, { target: route.target, shopName: route.shopName });
        case "profile":
            return _jsx(Profile, {});
        case "studio":
            return _jsx(Studio, {});
        case "invite":
            return _jsx(Invite, { token: route.token });
        case "map":
            return _jsx(MapScreen, {});
        case "cafes":
            return _jsx(AllCafes, { route: route });
        case "suggestEdit":
            return _jsx(SuggestEdit, { shopId: route.shopId });
        case "report":
            return _jsx(ReportCafe, { shopId: route.shopId });
        case "addCafe":
            return _jsx(AddCafe, { cafeName: route.cafeName });
    }
}
function Launching() {
    const { t } = useI18n();
    return (_jsxs("main", { className: "screen screen--glow launch", "aria-busy": "true", children: [_jsx("div", { className: "launch__doodle", children: _jsx(Doodle, { seed: "bunna", mood: "sleepy", size: 96, decorative: true }) }), _jsx("p", { className: "launch__text mono", children: t("launch.loading") })] }));
}
function LaunchFailed() {
    const { t } = useI18n();
    const { retry, telegramId } = useAuth();
    return (_jsxs("main", { className: "screen screen--glow launch", children: [_jsx("div", { className: "launch__doodle", children: _jsx(Doodle, { seed: telegramId ?? "bunna", mood: "sleepy", size: 96, decorative: true }) }), _jsx(Headline, { first: t("launch.failed"), second: t("launch.failedB"), size: 30, align: "center" }), _jsx("p", { className: "launch__text", children: t("launch.failedBody") }), _jsx(PrimaryAction, { text: t("launch.retry"), onClick: retry })] }));
}
/** What a render crash leaves on screen; reopening starts the app fresh. */
function Crashed() {
    const { t } = useI18n();
    return (_jsxs("main", { className: "screen screen--glow launch", children: [_jsx("div", { className: "launch__doodle", children: _jsx(Doodle, { seed: "bunna", mood: "sleepy", size: 96, decorative: true }) }), _jsx(Headline, { first: t("crash.title"), second: t("crash.titleB"), size: 30, align: "center" }), _jsx("p", { className: "launch__text", children: t("crash.body") }), _jsx(PrimaryAction, { text: t("crash.reload"), onClick: () => window.location.reload() })] }));
}
