import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { startTelegram } from "./telegram/sdk";
import "./styles/fonts";
import "./styles/tokens.css";
import "./styles/base.css";

startTelegram();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
