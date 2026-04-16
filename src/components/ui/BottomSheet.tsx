"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BadgeCheck, CheckCircle2 } from "lucide-react";

import LiveStatusCreateForm from "@/components/forms/LiveStatusCreateForm";
import { createPost } from "@/services/postService";
import { useAuthStore } from "@/lib/store/authStore";

import { createComment } from "@/services/postService";
import { useUIStore } from "@/lib/store/uiStore";

export default function BottomSheet() {
  const { isBottomSheetOpen, bottomSheetContent, bottomSheetData, closeBottomSheet } = useUIStore();
  const { userId, publicId, isAnonymous } = useAuthStore();
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // WriteForm 연동을 위한 상태 및 Ref
  const writeFormRef = useRef<{ submit: () => void } | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  // 드래그 높이 조절을 위한 상태 및 Ref
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
        // 댓글 등록 후 강제 리프레시나 상태 업데이트가 필요할 수 있음
        // PostDetail 내부에서 자동 로드는 아니므로 data 갱신 로직 필요
    } catch (error) {
        console.error("Comment failed:", error);
        alert("댓글 등록에 실패했습니다.");
    } finally {
        setIsSubmitting(false);
    }
  };

  // 콘텐츠 변경 시 초기 높이 설정
  useEffect(() => {
    if (isBottomSheetOpen) {
      if (bottomSheetContent === "postDetail") setSheetHeight(85);
      else if (bottomSheetContent === "write") setSheetHeight(90);
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
    let newHeight = Math.max(20, Math.min(95, startHeight.current - deltaVH));
    setSheetHeight(newHeight);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    // Snap points
    if (sheetHeight > 75) setSheetHeight(92);
    else if (sheetHeight > 35) setSheetHeight(50);
    else if (sheetHeight < 25) closeBottomSheet(); // 너무 낮으면 닫기
    else setSheetHeight(24);
  };

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isBottomSheetOpen && (
        <>
          {/* Dimmed Background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeBottomSheet}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[4px] transition-opacity cursor-pointer"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Bottom Sheet wrapper for fixed positioning */}
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
                {/* Visual drag handle - Enabled with pointer events */}
                <div 
                    className="flex justify-center pt-4 pb-2 cursor-ns-resize w-full bg-card-bg rounded-t-[40px] touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                  <div className="w-12 h-1.5 bg-border rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-2 border-b border-border sticky top-0 bg-card-bg z-10 shrink-0 min-h-[56px]">
                  {/* Left Action: Close */}
                  <button onClick={closeBottomSheet} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
                    <X size={24} />
                  </button>

                  {/* Center: Title */}
                  <h3 className="text-lg font-black text-foreground absolute left-1/2 -translate-x-1/2">
                    {bottomSheetContent === "write" ? "소식 글쓰기" : 
                     bottomSheetContent === "postDetail" ? "소식 상세보기" : 
                     bottomSheetContent === "liveCreate" ? "상황 제보" :
                     bottomSheetContent === "liveReply" ? "상황 알려주기" :
                     "상세 정보"}
                  </h3>

                  {/* Right Action: Submit (Write mode only) */}
                  {bottomSheetContent === "write" ? (
                    <button 
                      onClick={() => writeFormRef.current?.submit()}
                      disabled={!canSubmit}
                      className={`text-[15px] font-black px-4 py-2 rounded-xl transition-all ${
                        canSubmit ? "text-secondary hover:bg-secondary/5" : "text-gray-300"
                      }`}
                    >
                      등록
                    </button>
                  ) : (
                    <div className="w-10" /> /* Spacer if no right action */
                  )}
                </div>

                {/* Dynamic Content */}
                <div className="overflow-y-auto p-6 flex-1 overscroll-contain pb-32 flex flex-col">
                  {bottomSheetContent === "write" && <WriteForm ref={writeFormRef} onStateChange={setCanSubmit} />}
                  {bottomSheetContent === "postDetail" && <PostDetailView />}
                  {bottomSheetContent === "liveCreate" && <LiveCreateForm />}
                  {bottomSheetContent === "liveReply" && <LiveReplyForm />}
                  {bottomSheetContent === "liveDetail" && <LiveDetailView />}
                </div>

                {/* Sticky Bottom Actions for Post Detail */}
                {bottomSheetContent === "postDetail" && (
                  <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4 px-6 flex items-center space-x-3 bg-card-bg/80 backdrop-blur-xl z-20 pb-8 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
                      <input 
                        type="text" 
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="이웃에게 따뜻한 댓글을 남겨보세요." 
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


const WriteForm = forwardRef<{ submit: () => void }, { onStateChange: (ready: boolean) => void }>((props, ref) => {
    const { closeBottomSheet } = useUIStore();
    const { userId, publicId, profile, isAnonymous, toggleAnonymous, initAuth } = useAuthStore();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [postType, setPostType] = useState("동네질문");
    const [category, setCategory] = useState("기타");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // 부모에게 현재 내용을 전달하여 등록 버튼 활성화 여부 결정
    useEffect(() => {
        props.onStateChange(content.trim().length > 0);
    }, [content]);

    // 부모가 호출할 함수 노출
    useImperativeHandle(ref, () => ({
        submit: handleSubmit
    }));

    useEffect(() => {
        if (!userId) initAuth();
    }, []);

    const postTypes = ["동네질문", "동네가게", "같이해요", "정보공유"];
    const categories = [
        "날씨/교통", "부동산/이사", "학교/교육", "공공기관", "병원/약국", 
        "경로당/공원", "카페/만화방", "독서실/학습", "놀이터", "기타"
    ];

    const handleSubmit = async () => {
        if (!content.trim()) {
            alert("내용을 입력해주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            await createPost({
                title: title.trim() || null,
                content,
                post_type: postType,
                category,
                user_id: userId,
                public_id: publicId,
                is_anonymous: isAnonymous,
                score: postType === "정보공유" ? 0.6 : 0.5 // 지침서 기준 초기 점수
            });
            setIsSuccess(true);
            setTimeout(() => {
                closeBottomSheet();
            }, 1500);
        } catch (error) {
            console.error("등록 실패:", error);
            alert("알 수 없는 오류로 등록에 실패했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle2 size={32} className="text-secondary" />
                </div>
                <p className="text-lg font-bold text-foreground">동네 소식이 등록되었습니다!</p>
                <p className="text-sm text-gray-400">이웃들이 곧 소식을 확인하게 될 거예요.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-card-bg">
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
                    <label className="text-[11px] font-black text-secondary uppercase tracking-wider ml-1 mb-2 block">관심 주제</label>
                    <div className="flex overflow-x-auto pb-1 space-x-2 no-scrollbar">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`px-4 py-2 text-[12px] font-bold rounded-xl border transition-all whitespace-nowrap ${
                                    category === cat 
                                    ? "border-secondary bg-secondary/10 text-secondary font-black" 
                                    : "border-border text-gray-400 bg-nav-bg hover:border-gray-300"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col space-y-1 min-h-[200px]">
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
                    placeholder="우리 동네 이웃들과 나눌 소식을 적어보세요."
                    className="w-full text-[15px] py-4 flex-1 resize-none outline-none placeholder:text-gray-300 bg-transparent leading-relaxed text-foreground"
                />
            </div>

            {/* 작성자 옵션 레이어 */}
            <div className="bg-nav-bg/80 rounded-2xl p-4 my-2 border border-border flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${isAnonymous ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-secondary/10 text-secondary'}`}>
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
                        : "bg-secondary text-white hover:bg-[#1B5E20]"
                    }`}
                >
                    {isAnonymous ? "닉네임으로 전환" : "익명으로 전환"}
                </button>
            </div>

            <div className="flex items-center space-x-4 border-t border-border pt-5 mt-auto pb-2">
                <button className="p-2.5 bg-nav-bg border border-border text-gray-500 rounded-xl flex items-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                    <Camera size={20} />
                </button>
                <div className="flex-1">
                    <p className="text-[11px] text-gray-400 font-medium">실명(해시) 기반 활동 • 이웃 존중 문화</p>
                </div>
                {isSubmitting && (
                    <span className="w-5 h-5 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></span>
                )}
            </div>
        </div>
    );
});

function PostDetailView() {
    const { bottomSheetData } = useUIStore();
    const isOfficial = bottomSheetData?.is_official;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                    isOfficial 
                    ? "bg-secondary/10 text-secondary border-secondary/20" 
                    : "bg-nav-bg text-gray-500 border-border"
                }`}>
                    {isOfficial ? "공식 행사" : "동네질문"}
                </span>
                <span className="text-xs text-gray-400">{isOfficial ? "TourAPI 4.0" : "조금 전"}</span>
            </div>
            
            <div className="flex items-start justify-between group">
                <h2 className="text-[19px] font-black text-foreground leading-tight break-words flex-1">
                    {bottomSheetData?.title || "게시물이 없습니다."}
                </h2>
                {isOfficial && (
                    <div className="ml-3 shrink-0 flex flex-col items-center">
                        <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                            <BadgeCheck size={24} />
                        </div>
                        <span className="text-[9px] font-bold text-secondary mt-1 uppercase">Official</span>
                    </div>
                )}
            </div>

            {isOfficial ? (
                <div className="flex items-center space-x-2 mt-4 text-[13px] font-medium">
                    <div className="w-6 h-6 bg-secondary rounded-lg flex items-center justify-center">
                        <span className="text-white font-black text-[10px]">공</span>
                    </div>
                    <div className="text-foreground font-black opacity-80">한국관광공사 제공</div>
                </div>
            ) : (
                <div className="flex items-center space-x-2 mt-4 text-[13px] font-medium text-foreground/60">
                    <div className="w-8 h-8 bg-secondary/10 rounded-full shrink-0 flex items-center justify-center">
                        <span className="text-secondary font-bold text-xs">정</span>
                    </div>
                    <div className="text-foreground opacity-80">정다운 이웃</div>
                </div>
            )}

            <div className={`pt-2 pb-6 text-foreground leading-relaxed text-[15px] ${!isOfficial && "border-b border-border"} min-h-[120px] whitespace-pre-wrap opacity-90 font-medium`}>
                {bottomSheetData?.content || (isOfficial ? "행사 상세 정보가 준비 중입니다." : `정자동 쪽에 집중이 잘되는 조용한 독서실이 있을까요?
                
이번 주말에 시험이 있어서 빡세게 공부하려고 합니다.
추천해주시면 감사하겠습니다!`)}
            </div>
            
            {!isOfficial ? (
                /* 덧글 영역 (일반 포스트) */
                <div className="pt-2 pb-8">
                    <h3 className="font-bold text-foreground mb-4 text-sm">댓글 12</h3>
                    <div className="space-y-5">
                        <div className="flex space-x-3 items-start">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full shrink-0 flex items-center justify-center">
                                <span className="text-blue-800 dark:text-blue-400 font-bold text-xs">라이</span>
                            </div>
                            <div className="bg-nav-bg rounded-2xl rounded-tl-none p-3.5 flex-1 border border-border">
                                <div className="text-[12px] font-bold text-foreground mb-1">라이프스포츠주민</div>
                                <div className="text-[13px] text-foreground/80">라이프스포츠 근처 스터디카페 조용하고 좋아요! 시설도 엄청 깔끔합니다.</div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* 공식 데이터 안내 (공식 행사) */
                <div className="mt-4 p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                    <p className="text-[12px] text-secondary font-bold leading-relaxed">
                        💡 이 정보는 한국관광공사의 공공데이터를 기반으로 제공됩니다. 
                        현장 상황에 따라 내용이 다를 수 있으니 방문 전 공식 채널을 확인해 주세요.
                    </p>
                </div>
            )}
            
            {/* 하단 댓글창과 겹치지 않도록 충분한 여백 확보 */}
            <div className="h-28" />
        </div>
    )
}

function LiveCreateForm() {
    const { bottomSheetData, closeBottomSheet } = useUIStore();
    const mode = bottomSheetData?.mode || "share";
    
    return (
        <LiveStatusCreateForm 
            mode={mode}
            currentAddress={bottomSheetData?.address}
            latitude={bottomSheetData?.latitude}
            longitude={bottomSheetData?.longitude}
            onSuccess={closeBottomSheet}
        />
    );
}


function LiveReplyForm() {
    const { bottomSheetData, closeBottomSheet } = useUIStore();
    const mode = bottomSheetData?.mode || "reply";
    const [selectedStatus, setSelectedStatus] = useState(bottomSheetData?.defaultStatus || "보통");
    const [replyText, setReplyText] = useState("");

    const statusOptions = [
        { label: "여유", color: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200" },
        { label: "보통", color: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200" },
        { label: "혼잡", color: "bg-red-100 text-red-700 hover:bg-red-200 border-red-200" }
    ];

    const handleSubmit = () => {
        if (mode === "reply" && !replyText.trim()) return;
        if (bottomSheetData?.onSubmit) {
            bottomSheetData.onSubmit({
                selectedStatus,
                replyText
            });
        }
        closeBottomSheet();
    };

    return (
        <div className="space-y-4">
            <p className="text-[13px] text-gray-400 mb-2 font-medium">
                {mode === "reply" ? "이웃들에게 현재 상황을 정확하게 알려주세요." : "이전 사용자의 정보와 다르다면 알맞은 상태를 선택해주세요."}
            </p>
            <div className="flex gap-2">
                {statusOptions.map((opt) => (
                    <button
                        key={opt.label}
                        onClick={() => setSelectedStatus(opt.label)}
                        className={`flex-1 py-2.5 text-[14px] font-bold border rounded-xl transition-all ${
                            selectedStatus === opt.label 
                                ? `${opt.color} ring-2 ring-offset-1` 
                                : "bg-card-bg text-gray-400 border-border hover:bg-nav-bg"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            <textarea 
                className="w-full min-h-[120px] p-3.5 text-[14px] bg-nav-bg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/50 resize-none placeholder-gray-400 mt-2 text-foreground"
                placeholder={mode === "reply" ? "예: 지금 대기인원 10명 정도 있어요." : "어떤 점이 달라졌는지 이웃들에게 남겨주세요 (선택)"}
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
    const { bottomSheetData } = useUIStore();
    const detailItem = bottomSheetData?.detailItem;

    if (!detailItem) return null;

    return (
        <div className="space-y-4 pt-1">
            <div className="flex items-center space-x-2 mb-6">
                <span className={`text-[18px] font-extrabold ${detailItem.status_color || 'text-foreground'}`}>
                    {detailItem.is_request ? "답변 대기 중" : detailItem.status}
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
                        {detailItem.history.map((hist: any, idx: number, arr: any[]) => (
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
        </div>
    );
}
