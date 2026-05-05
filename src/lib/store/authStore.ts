import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { getPersistentUserId, generatePublicId, generateSentimentalNickname } from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";

type AuthProvider = "google" | "kakao";

interface AuthProfile {
    nickname: string;
    region?: string;
    is_verified: boolean;
    trust_score: number;
    activity_count: number;
    avatar_url?: string | null;
    email?: string | null;
    provider?: string | null;
}

type AuthClient = typeof supabase & {
    auth?: {
        getSession: () => Promise<{ data: { session: { user: User } | null }; error: unknown }>;
        onAuthStateChange: (
            callback: (event: string, session: { user: User } | null) => void,
        ) => { data: { subscription: { unsubscribe: () => void } } };
        signInWithOAuth: (options: {
            provider: AuthProvider;
            options?: { redirectTo?: string };
        }) => Promise<{ error: unknown }>;
        signOut: () => Promise<{ error: unknown }>;
    };
};

interface AuthState {
    userId: string;
    authUserId: string | null;
    anonymousId: string;
    publicId: string;
    profile: AuthProfile | null;
    isAnonymous: boolean;
    isAuthenticated: boolean;
    isAuthInitialized: boolean;
    setProfile: (profile: AuthProfile) => void;
    toggleAnonymous: () => void;
    initAuth: () => Promise<void>;
    signInWithProvider: (provider: AuthProvider) => Promise<void>;
    signOut: () => Promise<void>;
}

let authSubscription: { unsubscribe: () => void } | null = null;

function getAuthClient() {
    return supabase as AuthClient;
}

function getProvider(user: User) {
    const identities = user.identities || [];
    return identities[0]?.provider || user.app_metadata?.provider || null;
}

function getProfileSeed(user: User | null, publicId: string): AuthProfile {
    if (!user) {
        return {
            nickname: generateSentimentalNickname(publicId),
            is_verified: false,
            trust_score: 0.5,
            activity_count: 0,
        };
    }

    const metadata = user.user_metadata || {};
    const nickname =
        typeof metadata.name === "string"
            ? metadata.name
            : typeof metadata.full_name === "string"
                ? metadata.full_name
                : typeof metadata.nickname === "string"
                    ? metadata.nickname
                    : user.email?.split("@")[0] || generateSentimentalNickname(publicId);

    const avatarUrl =
        typeof metadata.avatar_url === "string"
            ? metadata.avatar_url
            : typeof metadata.picture === "string"
                ? metadata.picture
                : null;

    return {
        nickname,
        is_verified: true,
        trust_score: 0.7,
        activity_count: 0,
        avatar_url: avatarUrl,
        email: user.email,
        provider: getProvider(user),
    };
}

async function syncProfile(user: User | null, anonymousId: string, publicId: string) {
    const profileSeed = getProfileSeed(user, publicId);
    const userId = user?.id || anonymousId;

    try {
        const { data } = await supabase
            .from("profiles")
            .upsert(
                [
                    {
                        user_id: userId,
                        id: user?.id || null,
                        anonymous_id: user ? null : anonymousId,
                        nickname: profileSeed.nickname,
                        public_id: publicId,
                        provider: profileSeed.provider,
                        email: profileSeed.email,
                        avatar_url: profileSeed.avatar_url,
                        legacy_anonymous_id: user ? anonymousId : null,
                        last_active_at: new Date().toISOString(),
                    },
                ],
                { onConflict: "user_id" },
            )
            .select()
            .single();

        if (!data) return profileSeed;

        return {
            nickname: data.nickname || profileSeed.nickname,
            is_verified: Boolean(data.is_verified ?? profileSeed.is_verified),
            trust_score: Number(data.trust_score ?? profileSeed.trust_score),
            activity_count: Number(data.verified_count || 0) + Number(data.posts_count || 0),
            avatar_url: data.avatar_url || profileSeed.avatar_url,
            email: data.email || profileSeed.email,
            provider: data.provider || profileSeed.provider,
        } satisfies AuthProfile;
    } catch (err) {
        console.error("Profile sync failed:", err);
        return profileSeed;
    }
}

function getRedirectTo() {
    if (typeof window === "undefined") return undefined;
    return window.location.origin;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    userId: "",
    authUserId: null,
    anonymousId: "",
    publicId: "",
    profile: null,
    isAnonymous: true,
    isAuthenticated: false,
    isAuthInitialized: false,

    setProfile: (profile) => set({ profile }),

    toggleAnonymous: () => set((state) => ({ isAnonymous: !state.isAnonymous })),

    initAuth: async () => {
        if (typeof window === "undefined") return;

        const anonymousId = getPersistentUserId();
        const authClient = getAuthClient();
        const session = authClient.auth ? (await authClient.auth.getSession()).data.session : null;
        const user = session?.user || null;
        const stableUserId = user?.id || anonymousId;
        const publicId = generatePublicId(stableUserId);
        const profile = await syncProfile(user, anonymousId, publicId);

        set({
            userId: stableUserId,
            authUserId: user?.id || null,
            anonymousId,
            publicId,
            profile,
            isAnonymous: !user,
            isAuthenticated: Boolean(user),
            isAuthInitialized: true,
        });

        if (!authClient.auth || authSubscription) return;

        authSubscription = authClient.auth.onAuthStateChange(async (_event, nextSession) => {
            const nextUser = nextSession?.user || null;
            const nextUserId = nextUser?.id || get().anonymousId || getPersistentUserId();
            const nextPublicId = generatePublicId(nextUserId);
            const nextProfile = await syncProfile(nextUser, get().anonymousId || anonymousId, nextPublicId);

            set({
                userId: nextUserId,
                authUserId: nextUser?.id || null,
                publicId: nextPublicId,
                profile: nextProfile,
                isAnonymous: !nextUser,
                isAuthenticated: Boolean(nextUser),
                isAuthInitialized: true,
            });
        }).data.subscription;
    },

    signInWithProvider: async (provider) => {
        const authClient = getAuthClient();
        if (!authClient.auth) {
            throw new Error("Supabase Auth is not configured.");
        }

        const { error } = await authClient.auth.signInWithOAuth({
            provider,
            options: { redirectTo: getRedirectTo() },
        });

        if (error) throw error;
    },

    signOut: async () => {
        const authClient = getAuthClient();
        if (authClient.auth) {
            const { error } = await authClient.auth.signOut();
            if (error) throw error;
        }

        const anonymousId = getPersistentUserId();
        const publicId = generatePublicId(anonymousId);
        set({
            userId: anonymousId,
            authUserId: null,
            anonymousId,
            publicId,
            profile: getProfileSeed(null, publicId),
            isAnonymous: true,
            isAuthenticated: false,
            isAuthInitialized: true,
        });
    },
}));
