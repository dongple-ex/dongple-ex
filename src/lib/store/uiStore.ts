import { create } from 'zustand';

export type BottomSheetContent = "write" | "recordHub" | "postDetail" | "liveCreate" | "liveReply" | "liveDetail" | "contentReport" | null;

export type BottomSheetData = Record<string, unknown> | null;

interface UIState {
  isBottomSheetOpen: boolean;
  bottomSheetContent: BottomSheetContent;
  bottomSheetData: BottomSheetData;
  openBottomSheet: (content: BottomSheetContent, data?: BottomSheetData) => void;
  closeBottomSheet: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBottomSheetOpen: false,
  bottomSheetContent: null,
  bottomSheetData: null,
  openBottomSheet: (content, data = null) => set({ isBottomSheetOpen: true, bottomSheetContent: content, bottomSheetData: data }),
  closeBottomSheet: () => set({ isBottomSheetOpen: false, bottomSheetData: null }),
}));
