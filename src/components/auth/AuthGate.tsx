"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { consumeAuthIntent } from "@/lib/authActionIntent";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";

export default function AuthGate() {
  const router = useRouter();
  const openBottomSheet = useUIStore((state) => state.openBottomSheet);
  const closeBottomSheet = useUIStore((state) => state.closeBottomSheet);
  const initAuth = useAuthStore((state) => state.initAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthInitialized = useAuthStore((state) => state.isAuthInitialized);
  const handledIntentRef = useRef(false);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isAuthInitialized || !isAuthenticated || handledIntentRef.current) return;

    const intent = consumeAuthIntent();
    if (!intent) return;

    handledIntentRef.current = true;
    closeBottomSheet();

    if (intent.type === "path") {
      router.push(intent.href);
      return;
    }

    window.setTimeout(() => {
      openBottomSheet(intent.content, intent.data);
    }, 0);
  }, [closeBottomSheet, isAuthInitialized, isAuthenticated, openBottomSheet, router]);

  return null;
}
