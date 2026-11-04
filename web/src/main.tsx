import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { installErrorReporting } from "./lib/errorReporting";
import { startTelegram } from "./telegram/sdk";
import "./styles/fonts";
import "./styles/tokens.css";
import "./styles/base.css";
import "./ui/ui.css";

installErrorReporting();
startTelegram();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
