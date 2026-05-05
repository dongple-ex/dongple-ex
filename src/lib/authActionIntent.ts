import type { BottomSheetContent, BottomSheetData } from "@/lib/store/uiStore";

const AUTH_INTENT_KEY = "dongple_auth_intent";

export type AuthActionIntent =
  | {
      type: "bottomSheet";
      content: Exclude<BottomSheetContent, null | "authPrompt">;
      data?: BottomSheetData;
      callback?: () => void;
    }
  | {
      type: "path";
      href: string;
      callback?: () => void;
    };

export function saveAuthIntent(intent: AuthActionIntent) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH_INTENT_KEY, JSON.stringify(intent));
}

export function consumeAuthIntent(): AuthActionIntent | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(AUTH_INTENT_KEY);
  if (!raw) return null;

  window.sessionStorage.removeItem(AUTH_INTENT_KEY);

  try {
    return JSON.parse(raw) as AuthActionIntent;
  } catch {
    return null;
  }
}
