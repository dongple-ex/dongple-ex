"use client";

import BottomSheet from "./BottomSheet";
import AuthGate from "@/components/auth/AuthGate";

export default function GlobalModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthGate />
      {children}
      <BottomSheet />
    </>
  );
}
