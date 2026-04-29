"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ShieldCheck, User as UserIcon, AlertTriangle, Heart, Flag, LayoutList, RadioTower } from "lucide-react";
import { reportContent, ReportReason } from "@/services/moderationService";

import LiveStatusCreateForm from "@/components/forms/LiveStatusCreateForm";
import { saveAlbumMemory } from "@/lib/albumMemory";
import { createPost, createComment, fetchComments, likePost, reportPost } from "@/services/postService";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";
import { SHAREABLE_STATUS_OPTIONS } from "@/lib/statusTheme";

type CommentItem = {
  id: string;
  content: string;
  public_id?: string;
  is_anonymous?: boolean;
};

type CommentAddedEvent = CustomEvent<{ postId?: string }>;

type LiveDetailHistoryItem = {
  status: string;
  status_color: string;
  text: string;
  time: string;
};

export default function BottomSheet() {
  const { isBottomSheetOpen, bottomSheetContent, bottomSheetData, closeBottomSheet } = useUIStore();
  const { userId, publicId, isAnonymous } = useAuthStore();
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const writeFormRef = useRef<{ submit: () => void } | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  const [sheetHeight, setSheetHeight] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(50);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateComment = async () => {
    if (!commentText.trim() || !bottomSheetData?.id) return;
    
    setIsSubmitting(true);
    try {
        await createComment({
            post_id: bottomSheetData.id,
            content: commentText.trim(),
            user_id: userId,
            public_id: publicId,
            is_anonymous: isAnonymous
        });
        setCommentText("");
        window.dispatchEvent(new CustomEvent('comment-added', { detail: { postId: bottomSheetData.id } }));
    } catch (error) {
        console.error("Comment failed:", error);
        alert("댓글 등록에 실패했습니다.");
    } finally {
        setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isBottomSheetOpen) {
      if (bottomSheetContent === "postDetail" || bottomSheetContent === "liveCreate") setSheetHeight(85);
      else if (bottomSheetContent === "write" || bottomSheetContent === "recordHub") setSheetHeight(90);
      else setSheetHeight(50);
    }
  }, [isBottomSheetOpen, bottomSheetContent]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startHeight.current = sheetHeight;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaVH = ((e.clientY - startY.current) / window.innerHeight) * 100;
    const newHeight = Math.max(20, Math.min(95, startHeight.current - deltaVH));
    setSheetHeight(newHeight);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (sheetHeight > 75) setSheetHeight(92);
    else if (sheetHeight > 35) setSheetHeight(50);
    else if (sheetHeight < 25) closeBottomSheet();
    else setSheetHeight(24);
  };

  if (!mounted) return null;

  const titleMap: Record<string, string> = {
    write: "소식 글쓰기",
    recordHub: "기록하기",
    postDetail: "소식 상세보기",
    liveCreate: "현장 상태 공유",
    liveReply: "상황 알려주기",
    liveDetail: "상황 정보",
    contentReport: "부적절한 정보 신고",
  };
  const sheetTitle = bottomSheetContent ? titleMap[bottomSheetContent] || "상세 정보" : "상세 정보";

  return (
    <AnimatePresence>
      {isBottomSheetOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeBottomSheet}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[4px] transition-opacity cursor-pointer"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center pointer-events-none">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full flex justify-center pointer-events-auto"
            >
              <div
                className={`w-full flex flex-col bg-card-bg rounded-t-[40px] shadow-2xl pb-[env(safe-area-inset-bottom)] relative transition-all ${
                    isDragging ? 'duration-0' : 'duration-300'
                }`}
                style={{ height: `${sheetHeight}vh` }}
              >
                <div 
                    className="flex justify-center pt-4 pb-2 cursor-ns-resize w-full bg-card-bg rounded-t-[40px] touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                  <div className="w-12 h-1.5 bg-border rounded-full" />
                </div>

                <div className="flex items-center justify-between px-6 py-2 border-b border-border sticky top-0 bg-card-bg z-10 shrink-0 min-h-[56px]">
                  <button onClick={closeBottomSheet} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
                    <X size={24} />
                  </button>

                  <h3 className="text-lg font-black text-foreground absolute left-1/2 -translate-x-1/2">
                    {sheetTitle}
                  </h3>

                  {bottomSheetContent === "write" ? (
                    <button 
                      onClick={() => writeFormRef.current?.submit()}
                      disabled={!canSubmit}
                      className={`text-[15px] font-black px-4 py-2 rounded-xl transition-all ${
                        canSubmit ? "text-[#795548] hover:bg-[#795548]/5" : "text-gray-300"
                      }`}
                    >
                      등록
                    </button>
                  ) : (
                    <div className="w-10" />
                  )}
                </div>

                <div className="overflow-y-auto p-6 flex-1 overscroll-contain pb-32 flex flex-col">
                  {bottomSheetContent === "write" && <WriteForm ref={writeFormRef} onStateChange={setCanSubmit} />}
                  {bottomSheetContent === "recordHub" && <RecordHub />}
                  {bottomSheetContent === "postDetail" && <PostDetailView />}
                  {bottomSheetContent === "liveCreate" && <LiveCreateForm />}
                  {bottomSheetContent === "liveReply" && <LiveReplyForm />}
                  {bottomSheetContent === "liveDetail" && <LiveDetailView />}
                  {bottomSheetContent === "contentReport" && <ReportView />}
                </div>

                {bottomSheetContent === "postDetail" && (
                  <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4 px-6 flex items-center space-x-3 bg-card-bg/80 backdrop-blur-xl z-20 pb-8 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
                      <input 
                        type="text" 
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="이웃에게 따뜻한 댓글을 남겨보세요" 
                        className="flex-1 bg-nav-bg rounded-[20px] px-5 py-3 text-[14px] font-medium outline-none focus:ring-2 focus:ring-secondary/20 transition-all text-foreground" 
                      />
                      <button 
                        onClick={handleCreateComment}
                        disabled={isSubmitting || !commentText.trim()}
                        className="bg-secondary text-white px-6 py-3 rounded-[20px] text-[14px] font-black shadow-lg disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
                      >
                        {isSubmitting ? "..." : "등록"}
                      </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}


const WriteForm = forwardRef<{ submit: () => void }, { onStateChange: (ready: boolean) => void; showInlineSubmit?: boolean }>(({ onStateChange, showInlineSubmit = false }, ref) => {
    const { closeBottomSheet } = useUIStore();
    const { userId, publicId, profile, isAnonymous, toggleAnonymous, initAuth } = useAuthStore();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [postType, setPostType] = useState("동네질문");
    const [category, setCategory] = useState("기타");
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        onStateChange(content.trim().length > 0);
    }, [content, onStateChange]);

    useImperativeHandle(ref, () => ({
        submit: handleSubmit
    }));

    useEffect(() => {
        if (!userId) initAuth();
    }, [initAuth, userId]);

    const postTypes = ["동네질문", "동네가게", "같이해요", "정보공유"];
    const categories = [
        "교통", "부동산/이사", "학교/교육", "공공기관", "병원/약국", 
        "산책로/공원", "카페/맛집", "독서/학습", "데이트", "기타"
    ];

    const handleSubmit = async () => {
        if (!content.trim()) {
            alert("내용을 입력해주세요.");
            return;
        }

        try {
            const createdPost = await createPost({
                title: title.trim() || undefined,
                content,
                post_type: postType,
                category,
                user_id: userId,
                public_id: publicId,
                is_anonymous: isAnonymous,
                score: postType === "정보공유" ? 0.6 : 0.5
            });
            saveAlbumMemory({
                sourceId: createdPost.id,
                type: "post",
                title: createdPost.title || `${postType} 기록`,
                subtitle: postType,
                description: content.trim(),
                locationLabel: createdPost.title || category,
                category,
                createdAt: createdPost.created_at,
            });
            setIsSuccess(true);
            setTimeout(() => {
                closeBottomSheet();
            }, 1500);
        } catch (error) {
            console.error("등록 실패:", error);
            alert("알 수 없는 오류로 등록에 실패했습니다.");
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle2 size={32} className="text-secondary" />
                </div>
                <p className="text-lg font-bold text-foreground">동네 소식이 등록됐습니다.</p>
                <p className="text-sm text-gray-400">이웃들이 곧 소식을 확인하게 될 거예요.</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col bg-card-bg ${showInlineSubmit ? "pb-3" : "h-full"}`}>
            <div className="space-y-4 mb-4">
                <div>
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1 mb-2 block">글 종류</label>
                    <div className="flex overflow-x-auto pb-1 space-x-2 no-scrollbar">
                        {postTypes.map((type) => (
                            <button
                                key={type}
                                onClick={() => setPostType(type)}
                                className={`px-4 py-2 text-[12px] font-bold rounded-xl border transition-all whitespace-nowrap ${
                                    postType === type 
                                    ? "border-foreground bg-foreground text-card-bg shadow-md font-black" 
                                    : "border-border text-gray-500 bg-nav-bg hover:bg-gray-100 dark:hover:bg-gray-800"
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-[11px] font-black text-secondary uppercase tracking-wider ml-1 mb-2 block">관련 주제</label>
                    <div className="flex overflow-x-auto pb-1 space-x-2 no-scrollbar">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`px-4 py-2 text-[12px] font-bold rounded-xl border transition-all whitespace-nowrap ${
                                    category === cat 
                                    ? "border-[#795548] bg-[#795548]/10 text-[#795548] font-black" 
                                    : "border-border text-gray-400 bg-nav-bg hover:border-gray-300"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className={`flex flex-col space-y-1 ${showInlineSubmit ? "min-h-[140px]" : "min-h-[200px] flex-1"}`}>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목 (선택사항)"
                    className="w-full text-[16px] font-bold py-3 border-b border-border outline-none placeholder:text-gray-300 bg-transparent text-foreground shrink-0"
                />
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="우리 동네 이웃과 나누고 싶은 소식을 적어보세요."
                    className={`w-full text-[15px] py-4 resize-none outline-none placeholder:text-gray-300 bg-transparent leading-relaxed text-foreground ${
                        showInlineSubmit ? "min-h-[180px]" : "flex-1"
                    }`}
                />
            </div>

            <div className={`bg-nav-bg/80 rounded-2xl p-4 border border-border flex items-center justify-between ${showInlineSubmit ? "mt-4" : "my-2"}`}>
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${isAnonymous ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-[#795548]/10 text-[#795548]'}`}>
                        {isAnonymous ? <ShieldCheck size={20} /> : <UserIcon size={20} />}
                    </div>
                    <div>
                        <p className="text-[13px] font-black text-foreground">
                            {isAnonymous ? `익명 (${publicId})` : (profile?.nickname || "동네이웃")}
                        </p>
                        <p className="text-[11px] text-gray-400">활동 식별 방식 선택</p>
                    </div>
                </div>
                <button 
                    onClick={toggleAnonymous}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                        isAnonymous 
                        ? "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300" 
                        : "bg-[#795548] text-white hover:bg-[#5D4037]"
                    }`}
                >
                    {isAnonymous ? "닉네임으로 전환" : "익명으로 전환"}
                </button>
            </div>

            {showInlineSubmit && (
                <button
                    onClick={handleSubmit}
                    disabled={!content.trim()}
                    className="mt-3 w-full rounded-2xl bg-[#795548] py-4 text-[15px] font-black text-white shadow-lg shadow-[#795548]/20 transition-all disabled:opacity-40"
                >
                    소식 등록하기
                </button>
            )}
        </div>
    );
});

WriteForm.displayName = "WriteForm";

function RecordHub() {
    const { bottomSheetData, closeBottomSheet } = useUIStore();
    const defaultTab = bottomSheetData?.defaultTab === "post" ? "post" : "status";
    const [activeTab, setActiveTab] = useState<"status" | "post">(defaultTab);

    useEffect(() => {
        setActiveTab(bottomSheetData?.defaultTab === "post" ? "post" : "status");
    }, [bottomSheetData?.defaultTab]);

    return (
        <div className="flex flex-col gap-3">
            <div className="rounded-[24px] border border-border bg-nav-bg/70 p-1.5">
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setActiveTab("status")}
                        className={`flex items-center justify-center space-x-2 rounded-[18px] px-4 py-2.5 text-[13px] font-black transition-all ${
                            activeTab === "status"
                                ? "bg-secondary text-white shadow-lg shadow-secondary/20"
                                : "bg-transparent text-foreground/45"
                        }`}
                    >
                        <RadioTower size={16} />
                        <span>상황공유</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("post")}
                        className={`flex items-center justify-center space-x-2 rounded-[18px] px-4 py-2.5 text-[13px] font-black transition-all ${
                            activeTab === "post"
                                ? "bg-[#795548] text-white shadow-lg shadow-[#795548]/20"
                                : "bg-transparent text-foreground/45"
                        }`}
                    >
                        <LayoutList size={16} />
                        <span>소식 작성</span>
                    </button>
                </div>
            </div>

            <div className="rounded-[28px] border border-border bg-card-bg p-4 shadow-sm">
                <div className="mb-3">
                    <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${activeTab === "status" ? "text-secondary" : "text-[#795548]"}`}>
                        {activeTab === "status" ? "Realtime Share" : "Community Post"}
                    </p>
                    <h4 className="mt-1 text-[17px] font-black text-foreground">
                        {activeTab === "status" ? "지금 이 순간의 상황을 빠르게 공유" : "동네 소식을 게시글로 남기기"}
                    </h4>
                    <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-foreground/55">
                        {activeTab === "status"
                            ? "혼잡도, 대기, 현장 분위기처럼 즉시성이 중요한 정보는 상황공유로 등록합니다."
                            : "경험, 추천, 질문, 생활 정보처럼 맥락이 필요한 내용은 소식 작성으로 남깁니다."}
                    </p>
                </div>

                {activeTab === "status" ? (
                    <LiveStatusCreateForm mode="share" onSuccess={closeBottomSheet} compact />
                ) : (
                    <WriteForm onStateChange={() => {}} showInlineSubmit />
                )}
            </div>
        </div>
    );
}

function PostDetailView() {
    const { bottomSheetData, openBottomSheet } = useUIStore();
    const { userId } = useAuthStore();
    const isOfficial = bottomSheetData?.is_official;
    const officialSource = typeof bottomSheetData?.source === "string" ? bottomSheetData.source : "공식 연동";
    const officialAddress = typeof bottomSheetData?.address === "string" ? bottomSheetData.address : undefined;
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [likes, setLikes] = useState(bottomSheetData?.likes_count || 0);
    const [isLiked, setIsLiked] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const [isReported, setIsReported] = useState(false);

    const loadComments = useCallback(async () => {
        if (!bottomSheetData?.id || isOfficial) return;
        setLoadingComments(true);
        try {
            const data = await fetchComments(bottomSheetData.id);
            setComments(data || []);
        } catch (error) {
            console.error("Comments load failed:", error);
        } finally {
            setLoadingComments(false);
        }
    }, [bottomSheetData?.id, isOfficial]);

    useEffect(() => {
        loadComments();

        const handleCommentRefresh = (event: Event) => {
            const customEvent = event as CommentAddedEvent;
            if (customEvent.detail?.postId === bottomSheetData?.id) {
                loadComments();
            }
        };

        window.addEventListener('comment-added', handleCommentRefresh);
        return () => window.removeEventListener('comment-added', handleCommentRefresh);
    }, [bottomSheetData?.id, isOfficial, loadComments]);

    const handleLike = async () => {
        if (!userId || isOfficial) return;
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikes((prev: number) => newIsLiked ? prev + 1 : Math.max(0, prev - 1));
        
        try {
            await likePost(bottomSheetData.id);
        } catch (error) {
            setIsLiked(!newIsLiked);
            setLikes((prev: number) => !newIsLiked ? prev + 1 : Math.max(0, prev - 1));
            console.error("Like failed:", error);
        }
    };

    const handleReport = async () => {
        if (!userId || isReported) return;
        if (!confirm("이 게시글을 신고하시겠습니까? 내발문자 클린 가이드에 따라 검토됩니다.")) return;

        setIsReported(true);
        try {
            await reportPost(bottomSheetData.id, userId);
            alert("신고가 접수되었습니다. 신뢰도가 낮은 게시물은 자동으로 숨김 처리됩니다.");
        } catch (error) {
            console.error("Report failed:", error);
            setIsReported(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                    isOfficial 
                    ? "bg-secondary/10 text-secondary border-secondary/20" 
                    : "bg-nav-bg text-gray-500 border-border"
                }`}>
                    {isOfficial ? "공식 행사" : (bottomSheetData?.post_type || "동네소식")}
                </span>
                <span className="text-xs text-gray-400">{isOfficial ? "TourAPI 4.0" : "조금 전"}</span>
            </div>
            
            <div className="flex items-start justify-between group">
                <h2 className="text-[20px] font-black text-foreground leading-tight break-words flex-1">
                    {bottomSheetData?.title || bottomSheetData?.content?.substring(0, 30)}
                </h2>
                {!isOfficial && (
                  <>
                    <button 
                        onClick={handleLike}
                        className={`ml-3 flex flex-col items-center px-4 py-2.5 rounded-2xl transition-all border ${
                            isLiked ? "bg-red-50 text-red-500 border-red-100 shadow-sm" : "bg-nav-bg text-gray-300 border-border hover:border-gray-300"
                        }`}
                    >
                        <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
                        <span className="text-[10px] font-black mt-1">{likes}</span>
                    </button>
                    <button 
                        onClick={handleReport}
                        className={`ml-2 flex flex-col items-center px-4 py-2.5 rounded-2xl transition-all border ${
                            isReported ? "bg-gray-100 text-gray-400 border-gray-200" : "bg-nav-bg text-gray-300 border-border hover:border-gray-300 hover:text-orange-500"
                        }`}
                        disabled={isReported}
                    >
                        <Flag size={20} fill={isReported ? "currentColor" : "none"} />
                        <span className="text-[10px] font-black mt-1">{isReported ? "신고됨" : "신고"}</span>
                    </button>
                  </>
                )}
                {!isOfficial && (
                    <button 
                        onClick={() => openBottomSheet("contentReport", { targetId: bottomSheetData.id, targetType: "POST" })}
                        className="ml-3 p-2 text-gray-300 hover:text-red-400 transition-colors"
                        title="신고하기"
                    >
                        <AlertTriangle size={20} />
                    </button>
                )}
            </div>

            {isOfficial ? (
                <div className="mt-4 space-y-3">
                    <div className="flex items-center space-x-2 text-[13px] font-medium">
                    <div className="w-6 h-6 bg-secondary rounded-lg flex items-center justify-center">
                        <span className="text-white font-black text-[10px]">공</span>
                    </div>
                    <div className="text-foreground font-black opacity-80">{officialSource} 제공</div>
                    </div>
                    <div className="rounded-[24px] border border-secondary/15 bg-secondary/5 p-4">
                        <p className="text-[11px] font-black uppercase tracking-wider text-secondary">행사 현장 공유</p>
                        <p className="mt-2 text-[13px] font-medium leading-relaxed text-foreground/70">
                            행사 정보보다 더 중요한 건 지금 현장 분위기입니다. 붐빔, 대기, 분위기를 바로 남겨보세요.
                        </p>
                        <button
                            onClick={() =>
                                openBottomSheet("liveCreate", {
                                    mode: "share",
                                    eventId: bottomSheetData?.eventId || bottomSheetData?.id,
                                    defaultPlaceName: bottomSheetData?.defaultPlaceName || bottomSheetData?.title,
                                    address: officialAddress,
                                    latitude: bottomSheetData?.latitude,
                                    longitude: bottomSheetData?.longitude,
                                })
                            }
                            className="mt-3 inline-flex items-center justify-center rounded-2xl bg-secondary px-4 py-3 text-[13px] font-black text-white shadow-lg shadow-secondary/20"
                        >
                            이 행사 현장 공유하기
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center space-x-2 mt-4 text-[13px] font-medium text-foreground/60">
                    <div className="w-8 h-8 bg-secondary/10 rounded-full shrink-0 flex items-center justify-center">
                        <span className="text-secondary font-bold text-xs">
                            {(bottomSheetData?.public_id || "동").substring(0, 1)}
                        </span>
                    </div>
                    <div className="text-foreground opacity-80">
                        {bottomSheetData?.is_anonymous ? `익명 (${bottomSheetData?.public_id})` : "반가운 이웃"}
                    </div>
                </div>
            )}

            <div className={`pt-2 pb-6 text-foreground leading-relaxed text-[15px] ${!isOfficial && "border-b border-border"} min-h-[100px] whitespace-pre-wrap opacity-90 font-medium`}>
                {bottomSheetData?.content || (isOfficial ? "행사 상세 정보가 준비 중입니다." : "내용이 없습니다.")}
            </div>
            
            {!isOfficial && (
                <div className="pt-2 pb-8">
                    <h3 className="font-bold text-foreground mb-4 text-sm">댓글 {comments.length}</h3>
                    {loadingComments ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
                        </div>
                    ) : comments.length > 0 ? (
                        <div className="space-y-5">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex space-x-3 items-start animate-fade-in">
                                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                                        comment.is_anonymous ? 'bg-indigo-50 text-indigo-500' : 'bg-secondary/10 text-secondary'
                                    }`}>
                                        <span className="font-bold text-[10px]">
                                            {(comment.public_id || "동네").substring(0, 2)}
                                        </span>
                                    </div>
                                    <div className="bg-nav-bg rounded-2xl rounded-tl-none p-3.5 flex-1 border border-border/50">
                                        <div className="text-[11px] font-bold text-foreground mb-1 flex justify-between">
                                            <span>{comment.is_anonymous ? `익명 (${comment.public_id})` : "동네이웃"}</span>
                                            <span className="text-gray-300 font-medium">조금 전</span>
                                        </div>
                                        <div className="text-[13px] text-foreground/80 leading-relaxed font-medium">{comment.content}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-gray-300 border-2 border-dashed border-border rounded-[32px]">
                            <p className="text-[13px] font-bold">아직 댓글이 없습니다.</p>
                            <p className="text-[11px] mt-1 opacity-60">첫 댓글을 남겨 이웃과 소통해보세요!</p>
                        </div>
                    )}
                </div>
            )}
            
            <div className="h-28" />
        </div>
    );
}


function LiveCreateForm() {
    const { bottomSheetData, closeBottomSheet } = useUIStore();
    const data = (bottomSheetData || {}) as {
        mode?: "request" | "share";
        eventId?: string | number;
        defaultPlaceName?: string;
        address?: string;
        latitude?: number;
        longitude?: number;
    };
    const mode = data.mode || "share";
    
    return (
        <LiveStatusCreateForm 
            mode={mode}
            eventId={data.eventId}
            defaultPlaceName={data.defaultPlaceName}
            currentAddress={data.address}
            latitude={data.latitude}
            longitude={data.longitude}
            onSuccess={closeBottomSheet}
        />
    );
}


function LiveReplyForm() {
    const { bottomSheetData, closeBottomSheet } = useUIStore();
    const mode = bottomSheetData?.mode || "reply";
    const [selectedStatus, setSelectedStatus] = useState(bottomSheetData?.defaultStatus || "보통");
    const [replyText, setReplyText] = useState("");

    const handleSubmit = () => {
        if (mode === "reply" && !replyText.trim()) return;
        if (bottomSheetData?.onSubmit) {
            bottomSheetData.onSubmit({
                selectedStatus,
                replyText
            });
            alert("성공적으로 공유되었습니다.");
        }
        closeBottomSheet();
    };

    return (
        <div className="space-y-4">
            <p className="text-[13px] text-gray-400 mb-2 font-medium">
                {mode === "reply" ? "이웃들에게 현재 상황을 정확하게 알려주세요" : "이전 사용자의 정보와 다르다면 알맞은 상태를 선택해주세요."}
            </p>
            <div className="flex gap-2">
                {SHAREABLE_STATUS_OPTIONS.map((opt) => (
                    <button
                        key={opt.label}
                        onClick={() => setSelectedStatus(opt.label)}
                        className={`flex-1 py-2.5 text-[14px] font-bold border rounded-xl transition-all ${
                            selectedStatus === opt.label 
                                ? `${opt.tone} ${opt.hover} ${opt.border} ring-2 ring-offset-1 ${opt.ring}` 
                                : "bg-card-bg text-gray-400 border-border hover:bg-nav-bg"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            <textarea 
                className="w-full min-h-[120px] p-3.5 text-[14px] bg-nav-bg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/50 resize-none placeholder-gray-400 mt-2 text-foreground"
                placeholder={mode === "reply" ? "예: 지금 대기인데 10명 정도 있어요" : "어떤 점이 달라졌는지 이웃들에게 남겨주세요 (선택)"}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
            />
            <button 
                onClick={handleSubmit}
                disabled={mode === "reply" && !replyText.trim()}
                className="w-full py-4 text-[15px] font-bold text-white bg-secondary rounded-xl hover:bg-[#1B5E20] disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors mt-2 shadow-md"
            >
                이웃에게 공유하기
            </button>
        </div>
    );
}

function LiveDetailView() {
    const { bottomSheetData, openBottomSheet } = useUIStore();
    const detailItem = bottomSheetData?.detailItem;

    if (!detailItem) return null;

    return (
        <div className="space-y-4 pt-1">
            <div className="flex items-center space-x-2 mb-6">
                <span className={`text-[18px] font-extrabold ${detailItem.status_color || 'text-foreground'}`}>
                    {detailItem.is_request ? "도움 대기중" : detailItem.status}
                </span>
                {!detailItem.is_request && (
                    <div className="flex items-center text-[12px] font-bold text-gray-400 bg-nav-bg px-2.5 py-1 rounded-full border border-border">
                        <CheckCircle2 size={14} className="text-secondary mr-1" />
                        {detailItem.verified_count}명 동의
                    </div>
                )}
            </div>
            <div className="bg-nav-bg/50 rounded-xl p-4 text-[14px] border border-border min-h-[120px] pb-6">
                {detailItem.history && detailItem.history.length > 0 ? (
                    <div className="space-y-5">
                        {detailItem.history.map((hist: LiveDetailHistoryItem, idx: number, arr: LiveDetailHistoryItem[]) => (
                            <div key={idx} className="flex flex-col space-y-1.5 relative">
                                {idx !== arr.length - 1 && (
                                    <div className="absolute left-1.5 top-5 bottom-[-20px] w-0.5 bg-border"></div>
                                )}
                                <div className="flex items-center space-x-2.5 text-[11px] z-10 w-full pt-1">
                                    <div className={`w-3.5 h-3.5 rounded-full ${hist.status_color.replace('text-', 'bg-')} bg-opacity-70 border-2 border-card-bg shadow-sm shrink-0`} />
                                    <span className={`font-bold ${hist.status_color}`}>[{hist.status}]</span>
                                    <span className="text-gray-400 font-medium tracking-tight">{hist.time}</span>
                                </div>
                                <div className="pl-6 text-[14px] text-foreground font-medium break-words whitespace-pre-wrap leading-relaxed opacity-90">
                                    {hist.text}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-gray-400 italic text-center text-[13px] flex h-full items-center justify-center py-6">
                        이웃이 남긴 상태 코멘트 히스토리가 없습니다.
                    </div>
                )}
            </div>
            
            <div className="flex justify-end pt-2">
                <button 
                    onClick={() => openBottomSheet("contentReport", { targetId: detailItem.id, targetType: "STATUS" })}
                    className="flex items-center space-x-1.5 px-3 py-2 text-gray-300 hover:text-red-400/80 transition-all text-[11px] font-bold"
                >
                    <AlertTriangle size={14} />
                    <span>정보가 잘못되었나요? 신고하기</span>
                </button>
            </div>
        </div>
    );
}

function ReportView() {
    const { bottomSheetData, closeBottomSheet } = useUIStore();
    const { userId } = useAuthStore();
    const [reason, setReason] = useState<ReportReason | "">("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const reasons: ReportReason[] = ["허위 정보", "광고/홍보", "욕설/비하", "기타"];

    const handleReport = async () => {
        if (!reason || !userId || !bottomSheetData?.targetId) return;
        
        setSubmitting(true);
        try {
            await reportContent(userId, bottomSheetData.targetId, bottomSheetData.targetType, reason);
            setDone(true);
            setTimeout(() => {
                closeBottomSheet();
            }, 2000);
        } catch (error) {
            console.error("Report failed:", error);
            alert("신고 처리 중 실패했습니다. 다시 시도해주세요.");
        } finally {
            setSubmitting(false);
        }
    };

    if (done) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-red-500" />
                </div>
                <p className="text-lg font-bold text-foreground">신고가 접수되었습니다.</p>
                <p className="text-sm text-gray-400 text-center">깨끗한 동네를 위해 제보해주셔서 감사합니다.<br/>운영 정책에 따라 신속히 조치하겠습니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <p className="text-[14px] text-gray-500 leading-relaxed font-medium">
                해당 정보를 신고하시겠습니까?<br/>
                신고된 정보는 동네 이웃들에게 노출이 제한될 수 있습니다.
            </p>
            
            <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">신고 사유 선택</label>
                <div className="grid grid-cols-2 gap-2">
                    {reasons.map((r) => (
                        <button
                            key={r}
                            onClick={() => setReason(r)}
                            className={`py-3 px-4 rounded-xl text-[13px] font-bold border transition-all text-left ${
                                reason === r 
                                ? "border-red-500 bg-red-50 text-red-600 shadow-sm" 
                                : "border-border text-gray-500 bg-nav-bg hover:bg-gray-100"
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={handleReport}
                disabled={!reason || submitting}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-[15px] shadow-lg shadow-red-500/20 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
                {submitting ? "요청 중..." : "동네를 위해 신고하기"}
            </button>

            <button 
                onClick={closeBottomSheet}
                className="w-full py-3 text-[13px] font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
                취소
            </button>
        </div>
    );
}
