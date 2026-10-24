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
import { takeLaunchInvite } from "./lib/invite";
import { PrimaryAction } from "./telegram/buttons";
import { readFlag, writeFlag } from "./telegram/storage";
import { SchemeContext, useColorScheme } from "./telegram/theme";
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
  return (
    <SchemeContext value={scheme}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <LocationProvider>
              <Gate />
            </LocationProvider>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SchemeContext>
  );
}

/** First run, then sign-in, then the app (handoff, Flows). */
function Gate() {
  const { status } = useAuth();
  const [welcomed, setWelcomed] = useState<boolean | null>(null);

  useEffect(() => {
    void readFlag(WELCOMED).then((value) => setWelcomed(value === "1"));
  }, []);

  if (welcomed === null) return <Launching />;
  if (!welcomed) {
    return (
      <Welcome
        onDone={() => {
          setWelcomed(true);
          void writeFlag(WELCOMED, "1");
        }}
      />
    );
  }
  if (status === "loading") return <Launching />;
  if (status === "failed") return <LaunchFailed />;
  if (status === "signedOut") return <SignIn />;
  return (
    <NavigationProvider initial={{ name: "explore" }}>
      <Screens />
    </NavigationProvider>
  );
}

function Screens() {
  const { route, push } = useNavigation();

  // Opened from a friend's invite link: ask about it over Explore.
  useEffect(() => {
    const token = takeLaunchInvite();
    if (token) push({ name: "invite", token });
  }, [push]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  switch (route.name) {
    case "explore":
      return <Explore />;
    case "passport":
      return <Passport />;
    case "stats":
      return <Stats />;
    case "shop":
      return <Shop key={route.id} id={route.id} />;
    case "checkin":
      return <CheckIn shopId={route.shopId} />;
    case "ceremony":
      return <Ceremony checkIn={route.checkIn} wasAwake={route.wasAwake} />;
    case "share":
      return <ShareCard target={route.target} shopName={route.shopName} />;
    case "profile":
      return <Profile />;
    case "studio":
      return <Studio />;
    case "invite":
      return <Invite token={route.token} />;
    case "map":
      return <MapScreen />;
    case "cafes":
      return <AllCafes route={route} />;
  }
}

function Launching() {
  const { t } = useI18n();
  return (
    <main className="screen screen--glow launch" aria-busy="true">
      <div className="launch__doodle">
        <Doodle seed="bunna" mood="sleepy" size={96} decorative />
      </div>
      <p className="launch__text mono">{t("launch.loading")}</p>
    </main>
  );
}

function LaunchFailed() {
  const { t } = useI18n();
  const { retry, telegramId } = useAuth();
  return (
    <main className="screen screen--glow launch">
      <div className="launch__doodle">
        <Doodle seed={telegramId ?? "bunna"} mood="sleepy" size={96} decorative />
      </div>
      <Headline first={t("launch.failed")} second={t("launch.failedB")} size={30} align="center" />
      <p className="launch__text">{t("launch.failedBody")}</p>
      <PrimaryAction text={t("launch.retry")} onClick={retry} />
    </main>
  );
}
