import { create } from 'zustand';
import { getPersistentUserId, generatePublicId } from '@/lib/auth-utils';

interface AuthProfile {
    nickname: string;
    region?: string;
    is_verified: boolean;
}

interface AuthState {
    userId: string;
    publicId: string;
    profile: AuthProfile | null;
    isAnonymous: boolean;
    setProfile: (profile: AuthProfile) => void;
    toggleAnonymous: () => void;
    initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    userId: "",
    publicId: "",
    profile: {
        nickname: "동네이웃", // 기본 닉네임
        is_verified: false
    },
    isAnonymous: true, // 기본값은 익명으로 설정 (지침서 권장)

    setProfile: (profile) => set({ profile }),
    
    toggleAnonymous: () => set((state) => ({ isAnonymous: !state.isAnonymous })),

    initAuth: () => {
        if (typeof window === 'undefined') return;
        
        const uid = getPersistentUserId();
        const pid = generatePublicId(uid);
        
        set({ 
            userId: uid, 
            publicId: pid,
            isAnonymous: true
        });
    }
}));

