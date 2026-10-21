import { hapticFeedback } from "@telegram-apps/sdk-react";

/** The one strong haptic the stamp ceremony asks for (DESIGN.md §6.2). */
export function hapticSuccess(): void {
  hapticFeedback.notificationOccurred.ifAvailable("success");
}

export function hapticError(): void {
  hapticFeedback.notificationOccurred.ifAvailable("error");
}

export function hapticSelection(): void {
  hapticFeedback.selectionChanged.ifAvailable();
}
