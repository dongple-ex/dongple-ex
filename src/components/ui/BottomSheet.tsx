"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, CheckCircle2, ShieldCheck, User as UserIcon, AlertTriangle, Heart, Flag, LayoutList, RadioTower, MapPin, Search, Navigation, ArrowLeft } from "lucide-react";
import { reportContent, ReportReason } from "@/services/moderationService";

import LiveStatusCreateForm from "@/components/forms/LiveStatusCreateForm";
import LoginModal from "@/components/auth/LoginModal";
import { saveAlbumMemory } from "@/lib/albumMemory";
import { isEventActive } from "@/lib/eventPeriod";
import { createPost, createComment, fetchComments, likePost, reportPost } from "@/services/postService";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useLocationStore } from "@/lib/store/locationStore";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { SHAREABLE_STATUS_OPTIONS } from "@/lib/statusTheme";
import { searchPlaces, getAddressFromCoords, SearchPlaceResult } from "@/services/api";

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

type ApiRecord = Record<string, unknown>;

type OfficialInfoRow = {
  key: string;
  label: string;
  value: string;
};

type TourDetailInfo = {
  name?: string;
  text?: string;
};

type TourDetail = {
  summary?: string;
  overview?: string;
  highlights?: OfficialInfoRow[];
  info?: TourDetailInfo[];
  images?: string[];
  source?: string;
};

function isApiRecord(value: unknown): value is ApiRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatApiValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatTourDate(value: unknown) {
  const raw = formatApiValue(value).replace(/\D/g, "");
  if (raw.length !== 8) return formatApiValue(value);
  return `${raw.slice(0, 4)}.${raw.slice(4, 6)}.${raw.slice(6, 8)}`;
}

function formatTourDateTime(value: unknown) {
  const raw = formatApiValue(value).replace(/\D/g, "");
  if (raw.length < 8) return formatApiValue(value);
  const date = `${raw.slice(0, 4)}.${raw.slice(4, 6)}.${raw.slice(6, 8)}`;
  if (raw.length < 12) return date;
  return `${date} ${raw.slice(8, 10)}:${raw.slice(10, 12)}`;
}

function addOfficialInfoRow(rows: OfficialInfoRow[], key: string, label: string, value: unknown) {
  const formatted = formatApiValue(value);
  if (!formatted) return;
  rows.push({ key, label, value: formatted });
}

function toOfficialInfoRows(meta?: ApiRecord) {
  if (!meta) return [];

  const rows: OfficialInfoRow[] = [];
  const address = [meta.addr1, meta.addr2].map(formatApiValue).filter(Boolean).join(" ");
  const distance = Number(formatApiValue(meta.dist));
  const coordinates = meta.mapy && meta.mapx
    ? `${formatApiValue(meta.mapy)}, ${formatApiValue(meta.mapx)}`
    : "";
  const period = meta.eventstartdate || meta.eventenddate
    ? `${formatTourDate(meta.eventstartdate)} ~ ${formatTourDate(meta.eventenddate)}`
    : "";

  addOfficialInfoRow(rows, "title", "공식 명칭", meta.title);
  addOfficialInfoRow(rows, "address", "주소", address);
  addOfficialInfoRow(rows, "tel", "문의", meta.tel);
  if (Number.isFinite(distance)) {
    addOfficialInfoRow(rows, "dist", "현재 위치에서", `약 ${Math.round(distance).toLocaleString()}m`);
  }
  addOfficialInfoRow(rows, "eventplace", "행사 장소", meta.eventplace);
  addOfficialInfoRow(rows, "period", "행사 기간", period);
  addOfficialInfoRow(rows, "zipcode", "우편번호", meta.zipcode);
  addOfficialInfoRow(rows, "coordinates", "위치 좌표", coordinates);
  if (meta.firstimage || meta.firstimage2) {
    addOfficialInfoRow(rows, "image", "사진 정보", "대표 이미지 제공됨");
  }
  addOfficialInfoRow(rows, "modifiedtime", "정보 수정일", formatTourDateTime(meta.modifiedtime));
  addOfficialInfoRow(rows, "createdtime", "정보 등록일", formatTourDateTime(meta.createdtime));
  addOfficialInfoRow(rows, "contentid", "공식 콘텐츠 번호", meta.contentid);

  return rows;
}

function compactText(value: unknown, maxLength = 180) {
  const text = formatApiValue(value).replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

function normalizeOfficialRows(rows: OfficialInfoRow[]) {
  return rows
    .map((row, index) => ({
      ...row,
      key: row.key || `${row.label}-${index}`,
      value: compactText(row.value, row.label === "장소" ? 80 : 120),
    }))
    .filter((row) => row.value);
}

function getContentIdFromData(data?: ApiRecord) {
  if (!data) return "";
  if (typeof data.contentId === "string") return data.contentId;
  if (typeof data.contentid === "string") return data.contentid;
  const meta = isApiRecord(data.meta) ? data.meta : undefined;
  return formatApiValue(meta?.contentid);
}

function getContentTypeIdFromData(data?: ApiRecord) {
  if (!data) return "";
  if (typeof data.contentTypeId === "string") return data.contentTypeId;
  if (typeof data.contenttypeid === "string") return data.contenttypeid;
  const meta = isApiRecord(data.meta) ? data.meta : undefined;
  return formatApiValue(meta?.contenttypeid || data.category_code || data.category);
}

function isReadOnlyPostDetailData(data: unknown) {
  if (!isApiRecord(data)) return false;
  return data.is_official === true
    || typeof data.source === "string"
    || isApiRecord(data.meta)
    || isApiRecord(data.api_info);
}

export default function BottomSheet() {
  const { isBottomSheetOpen, bottomSheetContent, bottomSheetData, closeBottomSheet } = useUIStore();
  const { authUserId, anonymousId, publicId, isAnonymous, isAuthenticated } = useAuthStore();
  const requireAuth = useRequireAuth();
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
    if (!commentText.trim() || !bottomSheetData?.id || isReadOnlyPostDetailData(bottomSheetData)) return;
    if (!isAuthenticated) {
        requireAuth({ type: "bottomSheet", content: "postDetail", data: bottomSheetData });
        return;
    }
    
    setIsSubmitting(true);
    try {
        await createComment({
            post_id: bottomSheetData.id,
            content: commentText.trim(),
            user_id: authUserId,
            anonymous_id: authUserId ? null : anonymousId,
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
      else if (bottomSheetContent === "authPrompt") setSheetHeight(56);
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
    locationSearch: "지역 설정",
    authPrompt: "로그인이 필요해요",
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
                  {bottomSheetContent === "locationSearch" && <LocationSearchView />}
                  {bottomSheetContent === "authPrompt" && <LoginModal />}
                </div>

                {bottomSheetContent === "postDetail" && !isReadOnlyPostDetailData(bottomSheetData) && (
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
    const { authUserId, anonymousId, publicId, profile, isAnonymous, toggleAnonymous, initAuth } = useAuthStore();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [postType, setPostType] = useState("동네질문");
    const [category, setCategory] = useState("기타");
    const [createdMemoryHref, setCreatedMemoryHref] = useState<string | null>(null);

    useEffect(() => {
        onStateChange(content.trim().length > 0);
    }, [content, onStateChange]);

    useImperativeHandle(ref, () => ({
        submit: handleSubmit
    }));

    useEffect(() => {
        initAuth();
    }, [initAuth]);

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
                user_id: authUserId || undefined,
                anonymous_id: authUserId ? null : anonymousId,
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
            setCreatedMemoryHref("/album");
        } catch (error) {
            console.error("등록 실패:", error);
            alert("알 수 없는 오류로 등록에 실패했습니다.");
        }
    };

    if (createdMemoryHref) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle2 size={32} className="text-secondary" />
                </div>
                <p className="text-lg font-bold text-foreground">동네 소식이 등록됐습니다.</p>
                <p className="max-w-[260px] text-center text-sm text-gray-400">
                    소식에 올라가고 내발문자에도 기록으로 쌓였어요.
                </p>
                <div className="grid w-full grid-cols-2 gap-3 pt-2">
                    <Link
                        href="/news"
                        onClick={closeBottomSheet}
                        className="inline-flex items-center justify-center rounded-2xl bg-[#795548] px-4 py-3 text-[13px] font-black text-white"
                    >
                        소식에서 보기
                    </Link>
                    <Link
                        href={createdMemoryHref}
                        onClick={closeBottomSheet}
                        className="inline-flex items-center justify-center rounded-2xl border border-border px-4 py-3 text-[13px] font-black text-foreground/70"
                    >
                        내발문자에서 보기
                    </Link>
                </div>
                <button
                    type="button"
                    onClick={closeBottomSheet}
                    className="w-full rounded-2xl bg-foreground/5 px-4 py-3 text-[13px] font-black text-foreground/45"
                >
                    닫기
                </button>
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
                                    ? "border-foreground bg-foreground text-background shadow-md font-black" 
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
    const requireAuth = useRequireAuth();
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
                        onClick={() => 
                            requireAuth({ 
                                type: "bottomSheet", 
                                content: "recordHub", 
                                data: { defaultTab: "post" },
                                callback: () => setActiveTab("post")
                            })
                        }
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
                        {activeTab === "status" ? "지금 본 상태를 지도에 남기기" : "경험과 정보를 소식으로 남기기"}
                    </h4>
                    <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-foreground/55">
                        {activeTab === "status"
                            ? "혼잡도, 대기, 분위기처럼 지금 판단에 필요한 정보는 지도와 내발문자에 함께 이어집니다."
                            : "방문 경험, 추천, 질문처럼 맥락이 필요한 이야기는 소식에 남고 내 기록으로 쌓입니다."}
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
    const { userId, isAuthenticated } = useAuthStore();
    const requireAuth = useRequireAuth();
    const isOfficial = bottomSheetData?.is_official;
    const apiSource = typeof bottomSheetData?.source === "string" ? bottomSheetData.source : undefined;
    const officialSource = apiSource || "공식 연동";
    const officialAddress = typeof bottomSheetData?.address === "string" ? bottomSheetData.address : undefined;
    const eventStartDate = typeof bottomSheetData?.eventStartDate === "string" ? bottomSheetData.eventStartDate : undefined;
    const eventEndDate = typeof bottomSheetData?.eventEndDate === "string" ? bottomSheetData.eventEndDate : undefined;
    const canShareEventStatus = !isOfficial || isEventActive(eventStartDate, eventEndDate);
    const apiInfo = isApiRecord(bottomSheetData?.api_info) ? bottomSheetData.api_info : undefined;
    const apiMeta = isApiRecord(bottomSheetData?.meta) ? bottomSheetData.meta : undefined;
    const officialInfoRows = toOfficialInfoRows(apiMeta);
    const apiProvider = apiSource || formatApiValue(apiInfo?.provider) || "공식 정보";
    const isApiBacked = Boolean(apiSource || apiInfo || apiMeta);
    const detailContentId = getContentIdFromData(bottomSheetData || undefined);
    const detailContentTypeId = getContentTypeIdFromData(bottomSheetData || undefined);
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [likes, setLikes] = useState(bottomSheetData?.likes_count || 0);
    const [isLiked, setIsLiked] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const [isReported, setIsReported] = useState(false);
    const [tourDetail, setTourDetail] = useState<TourDetail | null>(null);
    const [loadingTourDetail, setLoadingTourDetail] = useState(false);
    const [isRemembered, setIsRemembered] = useState(false);

    const loadComments = useCallback(async () => {
        if (!bottomSheetData?.id || isOfficial || isApiBacked) return;
        setLoadingComments(true);
        try {
            const data = await fetchComments(bottomSheetData.id);
            setComments(data || []);
        } catch (error) {
            console.error("Comments load failed:", error);
        } finally {
            setLoadingComments(false);
        }
    }, [bottomSheetData?.id, isOfficial, isApiBacked]);

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

    useEffect(() => {
        if (!isApiBacked || !detailContentId) {
            setTourDetail(null);
            return;
        }

        const controller = new AbortController();
        const loadTourDetail = async () => {
            setLoadingTourDetail(true);
            try {
                const params = new URLSearchParams({ contentId: detailContentId });
                if (detailContentTypeId) params.set("contentTypeId", detailContentTypeId);
                const response = await fetch(`/api/tour/detail?${params.toString()}`, {
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error("Tour detail request failed");
                setTourDetail((await response.json()) as TourDetail);
            } catch (error) {
                if (error instanceof Error && error.name !== "AbortError") {
                    console.error("Tour detail load failed:", error);
                }
                setTourDetail(null);
            } finally {
                if (!controller.signal.aborted) setLoadingTourDetail(false);
            }
        };

        loadTourDetail();
        return () => controller.abort();
    }, [detailContentId, detailContentTypeId, isApiBacked]);

    const handleLike = async () => {
        if (isOfficial) return;
        if (!isAuthenticated) {
            requireAuth({ type: "bottomSheet", content: "postDetail", data: bottomSheetData });
            return;
        }
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
        if (isReported) return;
        if (!isAuthenticated) {
            requireAuth({ type: "bottomSheet", content: "postDetail", data: bottomSheetData });
            return;
        }
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

    const detailOverview = tourDetail?.overview?.trim();
    const detailSummary = tourDetail?.summary?.trim();
    const detailHighlights = normalizeOfficialRows(tourDetail?.highlights?.length ? tourDetail.highlights : officialInfoRows);
    const primaryHighlights = detailHighlights.slice(0, 6);
    const secondaryHighlights = detailHighlights.slice(6);
    const detailInfoRows = (tourDetail?.info || [])
        .filter((item) => item.name || item.text)
        .slice(0, 3)
        .map((item, index) => ({
            key: `detail-info-${index}`,
            label: item.name || "상세 정보",
            value: compactText(item.text || "", 220),
        }))
        .filter((row) => row.value);
    const displayContent = detailSummary || detailOverview || compactText(bottomSheetData?.content, 180) || (isOfficial ? "행사 상세 정보가 준비 중입니다." : "내용이 없습니다.");
    const detailTitle = formatApiValue(bottomSheetData?.title || bottomSheetData?.content).trim() || "기억한 장소";
    const detailLat = Number(formatApiValue(bottomSheetData?.latitude || apiMeta?.mapy));
    const detailLng = Number(formatApiValue(bottomSheetData?.longitude || apiMeta?.mapx));
    
    // 좌표 유효성 검사 (WGS84 범위 내 인지 확인)
    const isWgs84 = Number.isFinite(detailLat) && Number.isFinite(detailLng) && detailLat >= 33 && detailLat <= 39 && detailLng >= 124 && detailLng <= 132;
    
    const hasDetailLocation = isWgs84;
    const mapDetailHref = hasDetailLocation
        ? `/map?lat=${detailLat}&lng=${detailLng}&title=${encodeURIComponent(detailTitle)}&address=${encodeURIComponent(officialAddress || "")}`
        : "/map";
    const handleRememberPlace = () => {
        if (!isAuthenticated) {
            requireAuth({ type: "bottomSheet", content: "postDetail", data: bottomSheetData });
            return;
        }
        saveAlbumMemory({
            sourceId: formatApiValue(bottomSheetData?.id || detailContentId || detailTitle),
            type: "place",
            title: detailTitle,
            subtitle: isOfficial ? "공식 행사" : isApiBacked ? "공식 장소" : "소식",
            description: displayContent,
            locationLabel: officialAddress || detailTitle,
            address: officialAddress,
            latitude: hasDetailLocation ? detailLat : undefined,
            longitude: hasDetailLocation ? detailLng : undefined,
            tourapiContentId: detailContentId,
            category: isOfficial ? "행사" : formatApiValue(bottomSheetData?.category || bottomSheetData?.post_type || "장소"),
        });
        setIsRemembered(true);
    };
    const handleOpenRecordForDetail = () => {
        requireAuth({ type: "bottomSheet", content: "liveCreate", data: {
            mode: "share",
            eventId: isOfficial ? bottomSheetData?.eventId || bottomSheetData?.id : undefined,
            defaultPlaceName: detailTitle,
            address: officialAddress,
            latitude: hasDetailLocation ? detailLat : undefined,
            longitude: hasDetailLocation ? detailLng : undefined,
        }});
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                    isOfficial 
                    ? "bg-secondary/10 text-secondary border-secondary/20" 
                    : isApiBacked
                    ? "bg-secondary/10 text-secondary border-secondary/20"
                    : "bg-nav-bg text-gray-500 border-border"
                }`}>
                    {isOfficial ? "공식 행사" : isApiBacked ? "공식 장소 정보" : (bottomSheetData?.post_type || "동네소식")}
                </span>
                <span className="text-xs text-gray-400">{isApiBacked ? `${apiProvider} 제공` : "조금 전"}</span>
            </div>
            
            <div className="flex items-start justify-between group">
                <h2 className="text-[20px] font-black text-foreground leading-tight break-words flex-1">
                    {bottomSheetData?.title || bottomSheetData?.content?.substring(0, 30)}
                </h2>
                {!isOfficial && !isApiBacked && (
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
                {!isOfficial && !isApiBacked && (
                    <button 
                        onClick={() => requireAuth({ type: "bottomSheet", content: "contentReport", data: { targetId: bottomSheetData.id, targetType: "POST" } })}
                        className="ml-3 p-2 text-gray-300 hover:text-red-400 transition-colors"
                        title="신고하기"
                    >
                        <AlertTriangle size={20} />
                    </button>
                )}
            </div>

            {(isOfficial || isApiBacked) && (
                <div className="grid grid-cols-3 gap-2">
                    <Link
                        href={mapDetailHref}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-foreground px-2 text-center text-[12px] font-black leading-tight text-background"
                    >
                        지도에서 위치 보기
                    </Link>
                    <button
                        type="button"
                        onClick={handleOpenRecordForDetail}
                        disabled={isOfficial && !canShareEventStatus}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-secondary px-2 text-center text-[12px] font-black leading-tight text-white disabled:bg-foreground/10 disabled:text-foreground/35"
                    >
                        {isOfficial && !canShareEventStatus ? "행사 시작 후 기록" : "기록으로 남기기"}
                    </button>
                    <button
                        type="button"
                        onClick={handleRememberPlace}
                        className={`inline-flex min-h-[48px] items-center justify-center rounded-2xl border px-2 text-center text-[12px] font-black leading-tight ${
                            isRemembered
                                ? "border-secondary/20 bg-secondary/10 text-secondary"
                                : "border-border bg-card-bg text-foreground/70"
                        }`}
                    >
                        {isRemembered ? "기억됨" : "내발문자에 기억"}
                    </button>
                </div>
            )}

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
                            {canShareEventStatus
                                ? "행사 정보보다 더 중요한 건 지금 현장 분위기입니다. 붐빔, 대기, 분위기를 바로 남겨보세요."
                                : "행사 기간 전에는 현장 상태를 남길 수 없습니다. 행사 시작 후 현재 상태 공유가 열립니다."}
                        </p>
                        {eventStartDate && eventEndDate && (
                            <p className="mt-2 text-[12px] font-black text-foreground/45">
                                행사 기간: {eventStartDate} ~ {eventEndDate}
                            </p>
                        )}
                        {canShareEventStatus ? (
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
                        ) : (
                            <div className="mt-3 inline-flex items-center justify-center rounded-2xl bg-foreground/10 px-4 py-3 text-[13px] font-black text-foreground/35">
                                행사 시작 후 공유 가능
                            </div>
                        )}
                    </div>
                </div>
            ) : !isApiBacked ? (
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
            ) : null}

            {isApiBacked ? (
                <div className="rounded-[24px] border border-secondary/15 bg-secondary/5 p-4">
                    <p className="text-[11px] font-black uppercase tracking-wider text-secondary">Quick Read</p>
                    <h3 className="mt-1 text-[16px] font-black text-foreground">지금 볼 요약</h3>
                    <div className="mt-3 whitespace-pre-wrap text-[14px] font-semibold leading-relaxed text-foreground/75">
                        {loadingTourDetail && !detailOverview ? "공식 상세 정보를 불러오는 중입니다." : displayContent}
                    </div>
                </div>
            ) : (
                <div className={`pt-2 pb-6 text-foreground leading-relaxed text-[15px] ${!isOfficial && "border-b border-border"} min-h-[100px] whitespace-pre-wrap opacity-90 font-medium`}>
                    {displayContent}
                </div>
            )}

            {isApiBacked && (
                <div className="rounded-[24px] border border-secondary/15 bg-secondary/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-wider text-secondary">Decision Info</p>
                            <h3 className="mt-1 text-[15px] font-black text-foreground">가기 전에 확인</h3>
                            <p className="mt-1 text-[12px] font-bold leading-relaxed text-foreground/50">
                                시간, 요금, 장소처럼 결정에 필요한 것만 먼저 보여줘요.
                            </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-secondary/10 px-3 py-1 text-[11px] font-black text-secondary">
                            {apiProvider}
                        </span>
                    </div>

                    {primaryHighlights.length > 0 ? (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {primaryHighlights.map(({ key, ...row }) => (
                                <InfoPill key={key} {...row} />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-4 rounded-2xl border border-secondary/10 bg-card-bg/80 px-3 py-3 text-[12px] font-bold text-foreground/50">
                            아직 표시할 수 있는 공식 정보가 충분하지 않습니다.
                        </div>
                    )}

                    {secondaryHighlights.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 gap-2">
                            {secondaryHighlights.map(({ key, ...row }) => (
                                <ApiInfoRow key={key} {...row} />
                            ))}
                        </div>
                    )}

                    {detailInfoRows.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <p className="text-[11px] font-black text-foreground/45">현장 안내</p>
                            {detailInfoRows.map(({ key, ...row }) => (
                                <ApiInfoRow key={key} {...row} />
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {!isOfficial && !isApiBacked && (
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


function ApiInfoRow({ label, value }: OfficialInfoRow) {
    return (
        <div className="rounded-2xl border border-secondary/10 bg-card-bg/80 px-3 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-foreground/35">{label}</div>
            <div className="mt-1 break-words text-[12px] font-bold text-foreground/70">{value}</div>
        </div>
    );
}


function InfoPill({ label, value }: OfficialInfoRow) {
    return (
        <div className="min-h-[74px] rounded-2xl border border-secondary/10 bg-card-bg/85 px-3 py-3">
            <div className="text-[10px] font-black text-secondary">{label}</div>
            <div className="mt-1 line-clamp-2 break-words text-[12px] font-black leading-snug text-foreground/75">{value}</div>
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

function LocationSearchView() {
    const { regionName, setLocation, fetchLocation, isLoading: isLocating } = useLocationStore();
    const { closeBottomSheet } = useUIStore();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchPlaceResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsSearching(true);
        try {
            const data = await searchPlaces(query);
            setResults(data);
        } catch (error) {
            console.error("Location search failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectLocation = async (item: SearchPlaceResult) => {
        const lat = parseFloat(item.mapy);
        const lng = parseFloat(item.mapx);
        
        try {
            // 상세 주소 및 지역명(동 단위) 가져오기
            const addrResult = await getAddressFromCoords(lat, lng);
            setLocation(lat, lng, addrResult.fullAddress, addrResult.regionName);
            closeBottomSheet();
        } catch (error) {
            console.error("Failed to set selected location:", error);
            // 폴백: 장소 이름이라도 사용
            setLocation(lat, lng, item.roadAddress || item.address, item.title);
            closeBottomSheet();
        }
    };

    const handleCurrentLocation = async () => {
        await fetchLocation();
        closeBottomSheet();
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">현재 설정된 지역</p>
                <div className="flex items-center justify-between bg-nav-bg p-4 rounded-2xl border border-border">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-foreground">{regionName}</p>
                            <p className="text-[11px] text-gray-400">동네 소식을 이곳 기준으로 보여드려요</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-[11px] font-black text-secondary uppercase tracking-widest ml-1">동네 검색하기</p>
                <div className="relative group">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="동 이름이나 장소를 입력해보세요 (예: 정자동)"
                        className="w-full h-14 bg-nav-bg rounded-2xl pl-12 pr-4 text-[14px] font-bold border border-border focus:border-secondary focus:ring-4 focus:ring-secondary/5 outline-none transition-all placeholder:text-gray-300"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-secondary transition-colors" size={20} />
                    <button 
                        onClick={handleSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-8 px-3 bg-secondary text-white rounded-lg text-[11px] font-black shadow-sm"
                    >
                        검색
                    </button>
                </div>
            </div>

            <button
                onClick={handleCurrentLocation}
                disabled={isLocating}
                className="w-full py-4 flex items-center justify-center space-x-2 bg-foreground/5 rounded-2xl text-[14px] font-black text-foreground hover:bg-foreground/10 transition-all"
            >
                <Navigation size={18} className={isLocating ? "animate-spin" : ""} />
                <span>{isLocating ? "위치 찾는 중..." : "현재 위치로 설정하기"}</span>
            </button>

            <div className="space-y-3">
                {isSearching ? (
                    <div className="flex justify-center py-10">
                        <div className="w-6 h-6 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
                    </div>
                ) : results.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pb-10">
                        {results.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleSelectLocation(item)}
                                className="p-4 bg-card-bg border border-border rounded-2xl hover:border-secondary hover:bg-secondary/5 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <h5 className="text-[14px] font-black text-foreground group-hover:text-secondary transition-colors truncate">
                                            {item.title}
                                        </h5>
                                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                            {item.roadAddress || item.address}
                                        </p>
                                    </div>
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center text-gray-300 group-hover:bg-secondary/20 group-hover:text-secondary transition-all">
                                        <ArrowLeft className="rotate-180" size={14} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : query && !isSearching ? (
                    <div className="py-10 text-center">
                        <p className="text-[13px] font-bold text-gray-300">검색 결과가 없습니다.</p>
                        <p className="text-[11px] text-gray-400 mt-1">지역명이나 랜드마크를 입력해보세요.</p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function ReportView() {
    const { bottomSheetData, closeBottomSheet } = useUIStore();
    const { authUserId, isAuthenticated } = useAuthStore();
    const requireAuth = useRequireAuth();
    const [reason, setReason] = useState<ReportReason | "">("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const reasons: ReportReason[] = ["허위 정보", "광고/홍보", "욕설/비하", "기타"];

    const handleReport = async () => {
        if (!reason || !bottomSheetData?.targetId) return;
        if (!isAuthenticated || !authUserId) {
            requireAuth({ type: "bottomSheet", content: "contentReport", data: bottomSheetData });
            return;
        }
        
        setSubmitting(true);
        try {
            await reportContent(authUserId, bottomSheetData.targetId, bottomSheetData.targetType, reason);
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
