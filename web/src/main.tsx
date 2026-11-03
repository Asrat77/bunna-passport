import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initAnalytics, track } from "./lib/analytics";
import { launchContext } from "./telegram/launch";
import { startTelegram } from "./telegram/sdk";
import "./styles/fonts";
import "./styles/tokens.css";
import "./styles/base.css";
import "./ui/ui.css";

startTelegram();

const launch = launchContext();
initAnalytics({ in_telegram: launch.in_telegram, platform: launch.platform });
track("app_opened", launch);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
