import { create } from 'zustand';

export type BottomSheetContent = "write" | "postDetail" | "liveCreate" | "liveReply" | "liveDetail" | "contentReport" | null;

interface UIState {
  isBottomSheetOpen: boolean;
  bottomSheetContent: BottomSheetContent;
  bottomSheetData: any;
  openBottomSheet: (content: BottomSheetContent, data?: any) => void;
  closeBottomSheet: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBottomSheetOpen: false,
  bottomSheetContent: null,
  bottomSheetData: null,
  openBottomSheet: (content, data = null) => set({ isBottomSheetOpen: true, bottomSheetContent: content, bottomSheetData: data }),
  closeBottomSheet: () => set({ isBottomSheetOpen: false, bottomSheetData: null }),
}));
