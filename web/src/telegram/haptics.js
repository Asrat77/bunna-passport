import { hapticFeedback } from "@telegram-apps/sdk-react";
/** The one strong haptic the stamp ceremony asks for (DESIGN.md §6.2). */
export function hapticSuccess() {
    hapticFeedback.notificationOccurred.ifAvailable("success");
}
export function hapticError() {
    hapticFeedback.notificationOccurred.ifAvailable("error");
}
export function hapticSelection() {
    hapticFeedback.selectionChanged.ifAvailable();
}
/** The badge's double tick (DESIGN.md §7), after the stamp's thunk. */
export function hapticBadge() {
    hapticFeedback.impactOccurred.ifAvailable("light");
    window.setTimeout(() => hapticFeedback.impactOccurred.ifAvailable("light"), 90);
}
