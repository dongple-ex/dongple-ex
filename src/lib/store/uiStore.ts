import { create } from 'zustand';

export type BottomSheetContent = "write" | "recordHub" | "postDetail" | "liveCreate" | "liveReply" | "liveDetail" | "contentReport" | null;

export type BottomSheetData = Record<string, unknown> | null;

export type ThemeMode = "light" | "dark";

interface UIState {
  isBottomSheetOpen: boolean;
  bottomSheetContent: BottomSheetContent;
  bottomSheetData: BottomSheetData;
  theme: ThemeMode;
  openBottomSheet: (content: BottomSheetContent, data?: BottomSheetData) => void;
  closeBottomSheet: () => void;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBottomSheetOpen: false,
  bottomSheetContent: null,
  bottomSheetData: null,
  theme: "light",
  openBottomSheet: (content, data = null) => set({ isBottomSheetOpen: true, bottomSheetContent: content, bottomSheetData: data }),
  closeBottomSheet: () => set({ isBottomSheetOpen: false, bottomSheetData: null }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  setTheme: (theme) => set({ theme }),
}));
