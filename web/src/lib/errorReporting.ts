import { api } from "@/api/client";

/**
 * Sends crashes on this phone to the server, which turns them into Telegram
 * alerts for the operators (Ops::Alert). Best effort: a report that fails is
 * dropped, and a page load sends at most a handful.
 */

const MAX_REPORTS_PER_LOAD = 5;

/** Not bugs in Bunna: browser quirks and errors from scripts we don't own. */
const IGNORED = [/^Script error\.?$/i, /ResizeObserver loop/i, /^Load failed$/i, /Failed to fetch/i, /NetworkError/i];

const sent = new Set<string>();
let screen = "launch";

/** The screen on show, so an alert says where it happened. */
export function setErrorScreen(name: string): void {
  screen = name;
}

export function shouldReport(message: string, alreadySent: ReadonlySet<string>): boolean {
  if (!message.trim() || IGNORED.some((pattern) => pattern.test(message))) return false;
  return !alreadySent.has(message) && alreadySent.size < MAX_REPORTS_PER_LOAD;
}

export function describeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: `${error.name}: ${error.message}`, stack: error.stack };
  return { message: typeof error === "string" ? error : "Unknown error" };
}

export function reportError(error: unknown): void {
  const { message, stack } = describeError(error);
  if (!shouldReport(message, sent)) return;
  sent.add(message);
  if (import.meta.env.DEV) return;
  void api.reportClientError({ message: message.slice(0, 200), stack: stack?.slice(0, 1500), screen }).catch(() => {});
}

/** Catches what no component handles: thrown errors and rejected promises. */
export function installErrorReporting(): void {
  window.addEventListener("error", (event) => reportError(event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => reportError(event.reason));
}
