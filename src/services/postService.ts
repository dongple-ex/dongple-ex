import { supabase } from "@/lib/supabase";
import { createReplyNotification } from "@/services/notificationService";

export interface Post {
    id: string;
    title: string | null;
    content: string;
    post_type: string;
    category: string;
    user_id: string | null;
    public_id: string | null;
    is_anonymous: boolean;
    score: number;
    created_at: string;
    likes_count: number;
    comments_count: number;
    latitude?: number;
    longitude?: number;
    place_name?: string;
    address?: string;
}

/**
 * 동네 소식 목록 조회
 */
export async function fetchPosts(limit = 10) {
    try {
        const { error: checkError } = await supabase
            .from("posts")
            .select("is_hidden")
            .limit(1);

        let query = supabase
            .from("posts")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (!checkError) {
            query = query.eq("is_hidden", false);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Post[];
    } catch (err) {
        console.error("fetchPosts resilience fallback:", err);
        const { data, error } = await supabase
            .from("posts")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);
        
        if (error) return [];
        return data as Post[];
    }
}

/**
 * 카테고리별 동네 소식 조회
 */
export async function fetchPostsByCategory(category: string, limit = 10) {
    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("category", category)
        .gte("score", 0.2)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error(`Error fetching posts for category ${category}:`, error);
        return [];
    }
    return data as Post[];
}

/**
 * 동네 소식 단건 조회
 */
export async function fetchPostById(postId: string) {
    if (!postId) return null;

    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

    if (error) {
        console.error(`Error fetching post ${postId}:`, error);
        return null;
    }

    return data as Post;
}

/**
 * 동네 소식 등록
 */
export async function createPost(payload: { 
    title?: string, 
    content: string, 
    post_type: string, 
    category: string,
    user_id?: string,
    public_id?: string,
    is_anonymous?: boolean,
    score?: number,
    latitude?: number,
    longitude?: number,
    place_name?: string,
    address?: string
}) {
    const finalScore = payload.score ?? 0.6; 
    
    const { data, error } = await supabase
        .from("posts")
        .insert([{
            ...payload,
            user_id: payload.user_id || null,
            score: finalScore
        }])
        .select();

    if (error) {
        console.error("Supabase insert error:", error);
        throw error;
    }
    return data[0] as Post;
}

/**
 * 실시간 소식 구독
 */
export function subscribePosts(onUpdate: () => void) {
    return supabase
        .channel('posts_changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'posts'
        }, onUpdate)
        .subscribe();
}

/**
 * 좋아요(추천) 증가
 */
export async function likePost(postId: string) {
    const { error } = await supabase.rpc('increment_like_count', {
        p_post_id: postId
    });

    if (error) {
        const { error: updateError } = await supabase
            .from("posts")
            .update({ likes_count: supabase.rpc('increment', { row_id: postId }) })
            .eq("id", postId);
        
        if (updateError) throw updateError;
    }
}

/**
 * 댓글 목록 조회
 */
export async function fetchComments(postId: string) {
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);
    
    if (!postId || !isValidUuid) {
        return [];
    }

    const { data, error } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching comments:", error);
        return [];
    }
    return data;
}

/**
 * 댓글 등록
 */
export async function createComment(payload: {
    post_id: string,
    content: string,
    user_id?: string | null,
    public_id?: string | null,
    is_anonymous?: boolean
}) {
    const { data, error } = await supabase
        .from("post_comments")
        .insert([payload])
        .select();

    if (error) throw error;

    await supabase.rpc('increment_comment_count', {
        p_post_id: payload.post_id
    });

    await createReplyNotification({
        postId: payload.post_id,
        commentId: data[0].id,
        commenterUserId: payload.user_id,
        commentContent: payload.content,
    });

    return data[0];
}

/**
 * 게시글 신고
 */
export async function reportPost(postId: string, userId: string, reason: string = "부적절한 정보") {
    const { data, error } = await supabase.rpc('report_post', {
        p_post_id: postId,
        p_user_id: userId,
        p_reason: reason
    });

    if (error) throw error;
    return data as boolean;
}
