"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { saveAuthIntent, type AuthActionIntent } from "@/lib/authActionIntent";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";

export function useRequireAuth() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openBottomSheet = useUIStore((state) => state.openBottomSheet);

  return useCallback(
    (intent: AuthActionIntent, runWhenAuthed?: () => void) => {
      if (isAuthenticated) {
        const finalCallback = intent.callback || runWhenAuthed;
        if (finalCallback) {
          finalCallback();
          return;
        }
        if (intent.type === "path") {
          router.push(intent.href);
          return;
        }
        openBottomSheet(intent.content, intent.data);
        return;
      }

      saveAuthIntent(intent);
      openBottomSheet("authPrompt", { intent });
    },
    [isAuthenticated, openBottomSheet, router],
  );
}
