"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { useParams } from "next/navigation";
import PostDetail from "@/components/news/PostDetail";
import { fetchPostById, type Post } from "@/services/postService";

export default function NewsPostDetailPage() {
  const params = useParams<{ id: string }>();
  const postId = params?.id;
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      if (!postId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const nextPost = await fetchPostById(postId);
      if (!isMounted) return;

      setPost(nextPost);
      setIsLoading(false);
    }

    loadPost();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  return (
    <div className="min-h-screen bg-background px-6 py-5 text-foreground">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/news">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5 text-foreground/70 transition-colors hover:bg-foreground/10"
            aria-label="소식으로 돌아가기"
          >
            <ChevronLeft size={22} />
          </button>
        </Link>
        <div>
          <h1 className="text-lg font-black">소식 상세</h1>
          <p className="text-[11px] font-bold text-secondary">댓글과 반응을 확인해요</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-8 w-32 rounded-xl bg-foreground/5 animate-pulse" />
          <div className="h-40 rounded-3xl bg-foreground/5 animate-pulse" />
          <div className="h-24 rounded-3xl bg-foreground/5 animate-pulse" />
        </div>
      ) : post ? (
        <PostDetail post={post} onUpdate={() => fetchPostById(post.id).then(setPost)} />
      ) : (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card-bg px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-nav-bg text-foreground/25">
            <MessageSquare size={26} />
          </div>
          <p className="text-[15px] font-black">소식을 찾지 못했어요</p>
          <p className="mt-2 text-[12px] font-medium leading-relaxed text-foreground/45">
            삭제됐거나 더 이상 볼 수 없는 소식입니다.
          </p>
        </div>
      )}
    </div>
  );
}

