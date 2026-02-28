/**
 * Haptic feedback helper — wraps expo-haptics with a safe fallback.
 * On web or if expo-haptics is not installed, silently does nothing.
 */

let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {}

export function hapticLight() {
  try {
    Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

export function hapticMedium() {
  try {
    Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
}

export function hapticSuccess() {
  try {
    Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

export function hapticSelection() {
  try {
    Haptics?.selectionAsync?.();
  } catch {}
}
