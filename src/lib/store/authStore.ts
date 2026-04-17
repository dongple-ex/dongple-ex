import { create } from 'zustand';
import { getPersistentUserId, generatePublicId, generateSentimentalNickname } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabase';

interface AuthProfile {
    nickname: string;
    region?: string;
    is_verified: boolean;
    trust_score: number;
    activity_count: number;
}

interface AuthState {
    userId: string;
    publicId: string;
    profile: AuthProfile | null;
    isAnonymous: boolean;
    setProfile: (profile: AuthProfile) => void;
    toggleAnonymous: () => void;
    initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    userId: "",
    publicId: "",
    profile: {
        nickname: "동네이웃",
        is_verified: false,
        trust_score: 0.5,
        activity_count: 0
    },
    isAnonymous: true,

    setProfile: (profile) => set({ profile }),
    
    toggleAnonymous: () => set((state) => ({ isAnonymous: !state.isAnonymous })),

    initAuth: async () => {
        if (typeof window === 'undefined') return;
        
        const uid = getPersistentUserId();
        const pid = generatePublicId(uid);
        const nickname = generateSentimentalNickname(pid);
        
        // 1. 기본 정보 설정
        set({ 
            userId: uid, 
            publicId: pid,
            isAnonymous: true
        });

        // 2. Supabase 프로필 자동 생성/조회 (Upsert)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .upsert([
                    { 
                        user_id: uid, 
                        nickname: nickname,
                        last_active_at: new Date().toISOString()
                    }
                ], { onConflict: 'user_id' })
                .select()
                .single();

            if (data) {
                set({
                    profile: {
                        nickname: data.nickname,
                        is_verified: data.is_verified,
                        trust_score: Number(data.trust_score),
                        activity_count: (data.verified_count || 0) + (data.posts_count || 0)
                    }
                });
            }
        } catch (err) {
            console.error("Profile sync failed:", err);
        }
    }
}));

