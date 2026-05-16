import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminSettingsState {
  imageUpload: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
  };
  setImageUploadSettings: (settings: Partial<AdminSettingsState['imageUpload']>) => void;
}

export const useAdminSettingsStore = create<AdminSettingsState>()(
  persist(
    (set) => ({
      imageUpload: {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.6,
      },
      setImageUploadSettings: (settings) =>
        set((state) => ({
          imageUpload: { ...state.imageUpload, ...settings },
        })),
    }),
    {
      name: "admin-settings-storage",
    }
  )
);
