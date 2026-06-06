"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ArrowRight, 
  Edit3, 
  Footprints, 
  Heart, 
  LogOut, 
  MapPinned, 
  Moon, 
  Route, 
  Settings, 
  Share2, 
  Star, 
  Sun,
  PartyPopper,
  Coffee,
  Trees,
  ShieldCheck,
  MessageSquare,
  TrendingUp,
  LayoutGrid,
  List
} from "lucide-react";
import { motion } from "framer-motion";

import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { AlbumMemory, getAlbumMemories, subscribeAlbumMemories, toggleAlbumFavorite, saveAlbumMemory } from "@/lib/albumMemory";
import NotificationBell from "@/features/notifications/components/NotificationBell";
import OfficialEventSection from "@/features/events/components/OfficialEventSection";
import { fetchPosts, Post, subscribePosts } from "@/services/postService";

type AlbumFilter = "all" | "status" | "post" | "place" | "favorite";
type DiscoveryStatus = "혼잡" | "보통" | "여유" | "요청";

const FILTERS: { key: AlbumFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "status", label: "상태공유" },
  { key: "post", label: "소식" },
  { key: "place", label: "장소" },
  { key: "favorite", label: "즐겨찾기" },
];

const DISCOVERY_CARDS: {
  id: string;
  type: string;
  title: string;
  place: string;
  category: string;
  status: DiscoveryStatus;
  updated: string;
  summary: string;
  tags: string[];
  imageUrl: string;
  lat: number;
  lng: number;
  address: string;
}[] = [
  {
    id: "today-hwaseong-night",
    type: "공식+질문",
    title: "화성행궁 야간개장, 지금 가도 줄이 길까요?",
    place: "수원 화성행궁",
    category: "행사",
    status: "혼잡",
    updated: "5분 전",
    summary: "공식 행사는 진행 중이고, 현장 공유 기준 입장 대기와 사진 명소 주변이 붐비는 편이에요.",
    tags: ["대기 있음", "사진 명소", "야간 행사"],
    imageUrl: "https://www.suwon.go.kr/webcontent/ckeditor/2026/5/4/d88dc018-7cb8-429f-a49c-478f47654b43.jpg",
    lat: 37.2811,
    lng: 127.0135,
    address: "경기 수원시 팔달구 정조로 825",
  },
  {
    id: "today-cafe-street",
    type: "후기+상태",
    title: "행궁동 카페거리, 비 오는 날에도 걷기 괜찮을까요?",
    place: "행궁동 카페거리",
    category: "카페",
    status: "보통",
    updated: "12분 전",
    summary: "골목은 비교적 여유롭지만 인기 카페는 대기가 조금 있어요. 포장이나 짧은 방문에 좋아요.",
    tags: ["카페 대기", "골목 산책", "포장 추천"],
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=900&auto=format&fit=crop",
    lat: 37.2834,
    lng: 127.0148,
    address: "경기 수원시 팔달구 행궁동",
  },
  {
    id: "today-park-walk",
    type: "추천",
    title: "방화수류정 산책길, 지금은 한산한 편이에요.",
    place: "방화수류정",
    category: "산책",
    status: "여유",
    updated: "18분 전",
    summary: "바람이 좋고 산책 인원이 많지 않아요. 해 질 무렵에는 사진 찍는 사람이 늘 수 있어요.",
    tags: ["한산", "산책 추천", "노을"],
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=900&auto=format&fit=crop",
    lat: 37.2878,
    lng: 127.0177,
    address: "경기 수원시 팔달구 수원천로392번길",
  },
];

const formatTime = (value: string) =>
  new Date(value).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function JourneyAlbumPage() {
  const router = useRouter();
  const { publicId, profile, isAuthenticated, isAuthInitialized, signOut, updateNickname } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const openBottomSheet = useUIStore((state) => state.openBottomSheet);
  const requireAuth = useRequireAuth();
  const [memories, setMemories] = useState<AlbumMemory[]>([]);
  const [activeFilter, setActiveFilter] = useState<AlbumFilter>("all");
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState("");

  // 추가된 홈 콘텐츠 상태
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  useEffect(() => {
    if (profile?.nickname) {
      setNewNickname(profile.nickname);
    }
  }, [profile?.nickname]);

  const handleUpdateNickname = async () => {
    if (!newNickname.trim() || newNickname === profile?.nickname) {
      setIsEditingNickname(false);
      return;
    }
    try {
      await updateNickname(newNickname.trim());
      setIsEditingNickname(false);
    } catch (err) {
      console.error("Nickname update failed:", err);
      alert("별명 수정에 실패했습니다.");
    }
  };

  useEffect(() => {
    if (!isAuthInitialized || isAuthenticated) return;
    requireAuth({ type: "path", href: "/me" });
  }, [isAuthInitialized, isAuthenticated, requireAuth]);

  useEffect(() => {
    if (!isAuthInitialized) return;
    const sync = () => setMemories(getAlbumMemories());
    sync();
    return subscribeAlbumMemories(sync);
  }, [isAuthInitialized]);

  // 커뮤니티 소식 로딩
  const loadPosts = async () => {
    setIsLoadingPosts(true);
    try {
      setPosts(await fetchPosts(10));
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    loadPosts();
    const sub = subscribePosts(loadPosts);
    return () => {
      void sub.unsubscribe();
    };
  }, []);

  const handleSaveDiscovery = (item: typeof DISCOVERY_CARDS[number]) => {
    saveAlbumMemory({
      sourceId: item.id,
      type: "place",
      title: item.place,
      subtitle: item.type,
      description: item.summary,
      locationLabel: item.place,
      address: item.address,
      latitude: item.lat,
      longitude: item.lng,
      category: item.category,
      statusLabel: item.status,
    });
    setMemories(getAlbumMemories());
  };

  const handleRequestDiscovery = (item: typeof DISCOVERY_CARDS[number]) => {
    requireAuth({
      type: "bottomSheet",
      content: "liveCreate",
      data: {
        mode: "request",
        defaultPlaceName: item.place,
        address: item.address,
        latitude: item.lat,
        longitude: item.lng,
      },
    });
  };

  const filteredMemories = useMemo(() => {
    if (activeFilter === "favorite") return memories.filter((item) => item.favorite);
    if (activeFilter === "all") return memories;
    return memories.filter((item) => item.type === activeFilter);
  }, [activeFilter, memories]);

  const favoriteMemories = useMemo(() => memories.filter((item) => item.favorite).slice(0, 3), [memories]);
  const bestMemory = favoriteMemories[0] || memories[0];
  const journeyMemories = useMemo(
    () =>
      memories
        .filter((memory) => Number.isFinite(memory.latitude) && Number.isFinite(memory.longitude))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [memories],
  );
  const journeyMapHref = journeyMemories.length >= 2 ? "/map?journey=album" : "/map";

  const stats = useMemo(() => {
    const placeCount = new Set(memories.map((item) => item.locationLabel || item.title)).size;
    const favoriteCount = memories.filter((item) => item.favorite).length;
    const statusCount = memories.filter((item) => item.type === "status").length;
    const postCount = memories.filter((item) => item.type === "post").length;

    return { records: memories.length, places: placeCount, favorites: favoriteCount, statusCount, postCount };
  }, [memories]);

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-5 pb-4 pt-12 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="-ml-2 p-2 text-foreground/60 transition-colors hover:text-foreground" aria-label="뒤로">
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary">Naebalmunja Hub</p>
            <h1 className="mt-1 text-lg font-black">내발문자</h1>
          </div>
          <div className="-mr-2 flex items-center gap-1">
            <NotificationBell />
            <button className="p-2 text-secondary transition-transform active:scale-95" aria-label="공유">
              <Share2 size={22} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-6 px-5 py-6">
        {/* 1. 프로필 요약 카드 */}
        <section className="overflow-hidden rounded-[28px] border border-border bg-card-bg shadow-sm">
          <div className="bg-gradient-to-br from-secondary/10 via-card-bg to-accent/5 px-6 py-6">
            <div className="flex flex-col items-center gap-4">
              {profile?.avatar_url ? (
                <div className="relative h-20 w-20 overflow-hidden rounded-[24px] border-2 border-white shadow-md">
                   <Image src={profile.avatar_url} alt="Profile" fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-secondary/10 text-secondary shadow-sm">
                  <Footprints size={32} />
                </div>
              )}
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary">
                  {isAuthenticated ? `${profile?.provider} Authenticated` : "Anonymous Loop"}
                </p>
                {isEditingNickname ? (
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <input
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      autoFocus
                      className="w-full max-w-[160px] rounded-lg border border-secondary/30 bg-background/50 px-3 py-1.5 text-center text-[18px] font-black outline-none focus:border-secondary"
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateNickname()}
                    />
                    <button
                      onClick={handleUpdateNickname}
                      className="rounded-xl bg-secondary px-3 py-2 text-[11px] font-black text-white shadow-lg shadow-secondary/20"
                    >
                      저장
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <h2 className="text-[22px] font-black leading-tight text-foreground">
                      {profile?.nickname || `익명 ${publicId || "사용자"}`}
                    </h2>
                    <button
                      onClick={() => setIsEditingNickname(true)}
                      className="rounded-full bg-foreground/5 p-1.5 text-foreground/30 transition-colors hover:bg-secondary/10 hover:text-secondary"
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>
                )}
                {isAuthenticated && profile?.email && (
                  <p className="mt-1 text-[12px] font-bold text-foreground/40">{profile.email}</p>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-3">
              <SummaryStat label="기록" value={`${stats.records}`} />
              <SummaryStat label="장소" value={`${stats.places}`} />
              <SummaryStat label="하트" value={`${stats.favorites}`} />
              <SummaryStat label="상태" value={`${stats.statusCount}`} />
            </div>
          </div>
        </section>

        {/* 2. [NEW] 오늘 바로 판단할 곳 (Today Discovery) */}
        <section className="pt-2">
          <SectionHeading
            eyebrow="Today Discovery"
            title="오늘 바로 판단할 곳"
            description="공식 일정과 현장 분위기를 함께 보고 움직일 곳을 고르세요."
          />
          <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {DISCOVERY_CARDS.map((item) => (
              <DiscoveryCard
                key={item.id}
                item={item}
                onSave={() => handleSaveDiscovery(item)}
                onRequest={() => handleRequestDiscovery(item)}
              />
            ))}
          </div>
        </section>

        {/* 3. [NEW] 오늘 행사 상황 (Official Events) */}
        <section className="pt-2">
          <SectionHeading
            eyebrow="Official Events"
            title="오늘 행사 상황"
            description="동네에서 진행되는 행사와 현장 소식을 빠르게 확인하세요."
          />
          <div className="mt-4">
            <OfficialEventSection />
          </div>
        </section>

        {/* 4. Best Memory */}
        <section className="rounded-[28px] border border-border bg-card-bg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary">Best Memory</p>
              <h3 className="mt-1 text-[20px] font-black">지도에서 다시 확인할 기억</h3>
            </div>
            <Star size={20} className="text-accent" />
          </div>
          {bestMemory ? <MemoryHero memory={bestMemory} /> : <EmptyBlock title="아직 기록한 장소가 없어요." description="소식에서 마음에 드는 곳을 발견하거나 지도에서 현장 상태를 남겨보세요." />}
        </section>

        {/* 5. Favorites (다시 가고 싶은 장소) */}
        <section className="rounded-[28px] border border-border bg-card-bg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary">Favorites</p>
              <h3 className="mt-1 text-[20px] font-black">다시 가고 싶은 장소</h3>
            </div>
            <Heart size={18} className="text-secondary" />
          </div>
          {favoriteMemories.length > 0 ? (
            <div className="mt-4 space-y-3">
              {favoriteMemories.map((memory) => (
                <MemoryListCard key={memory.id} memory={memory} onFavoriteToggle={() => toggleAlbumFavorite(memory.id)} />
              ))}
            </div>
          ) : (
            <EmptyBlock title="즐겨찾기한 장소가 없어요." description="기록 카드의 하트 버튼으로 다음에 다시 볼 장소를 모아둘 수 있어요." />
          )}
        </section>

        {/* 6. Memory Cards (내 발자국이 머문 자리들) */}
        <section className="rounded-[28px] border border-border bg-card-bg p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary">Memory Cards</p>
              <h3 className="mt-1 text-[20px] font-black">내 발자국이 머문 자리들</h3>
            </div>
            <MapPinned size={18} className="text-secondary" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full px-3.5 py-2 text-[12px] font-black ${
                  activeFilter === filter.key ? "bg-foreground text-background shadow-md" : "bg-nav-bg text-foreground/55 hover:bg-foreground/5"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {filteredMemories.length > 0 ? (
            <div className="mt-4 space-y-3">
              {filteredMemories.map((memory, index) => (
                <motion.div key={memory.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                  <MemoryListCard memory={memory} onFavoriteToggle={() => toggleAlbumFavorite(memory.id)} />
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyBlock title="이 필터에 해당하는 기록이 없어요." description="다른 필터를 보거나 새로운 장소와 상태를 기록해보세요." />
          )}
        </section>

        {/* 7. Footprints (나의 발자취 타임라인) */}
        <section className="rounded-[28px] border border-border bg-card-bg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary">Footprints</p>
              <h3 className="mt-1 text-[20px] font-black">나의 발자취</h3>
            </div>
            <Route size={18} className="text-secondary" />
          </div>

          {memories.length > 0 ? (
            <div className="mt-5 space-y-4">
              {memories.slice(0, 8).map((memory, index) => (
                <div key={memory.id} className="relative pl-6">
                  {index !== Math.min(memories.length, 8) - 1 && <div className="absolute left-[7px] top-5 h-[calc(100%+12px)] w-px bg-border" />}
                  <div className="absolute left-0 top-1 h-[14px] w-[14px] rounded-full bg-secondary ring-4 ring-secondary/10" />
                  <div className="rounded-[22px] border border-border bg-nav-bg/50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-black">{memory.locationLabel || memory.title}</span>
                      <span className="text-[11px] font-bold text-foreground/40">{formatTime(memory.createdAt)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-black text-secondary">{getMemoryTypeLabel(memory.type)}</span>
                      {memory.statusLabel && <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-black text-foreground/55">{memory.statusLabel}</span>}
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-foreground/65">{memory.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock title="아직 발자취가 비어 있어요." description="첫 기록을 남기면 내발문자가 시간순으로 발자취를 엮어줍니다." />
          )}
        </section>

        {/* 8. Journey Map (여정) */}
        <section className="overflow-hidden rounded-[28px] border border-secondary/15 bg-card-bg shadow-sm">
          <div className="bg-gradient-to-br from-secondary/10 via-card-bg to-accent/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary">Journey Map</p>
                <h3 className="mt-1 text-[20px] font-black">기록을 선으로 잇는 여정</h3>
                <p className="mt-2 text-[13px] font-bold leading-relaxed text-foreground/55">
                  좌표가 남아있는 장소를 시간순으로 연결해서 오늘까지의 이동 흐름을 지도에서 볼 수 있어요.
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-secondary text-white shadow-lg shadow-secondary/25">
                <Route size={20} />
              </div>
            </div>

            {journeyMemories.length >= 2 ? (
              <>
                <div className="mt-5 rounded-[24px] border border-white/60 bg-background/70 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-foreground/35">Connected Points</p>
                      <p className="mt-1 text-[24px] font-black text-secondary">{journeyMemories.length}곳</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-black text-foreground/45">첫 기록</p>
                      <p className="mt-1 text-[13px] font-black">{formatTime(journeyMemories[0].createdAt)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 overflow-hidden">
                    {journeyMemories.slice(0, 5).map((memory, index) => (
                      <div key={memory.id} className="flex min-w-0 items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-black text-white">
                          {index + 1}
                        </div>
                        {index < Math.min(journeyMemories.length, 5) - 1 && <div className="h-px w-7 shrink-0 bg-secondary/35" />}
                      </div>
                    ))}
                    {journeyMemories.length > 5 && <span className="text-[11px] font-black text-foreground/35">+{journeyMemories.length - 5}</span>}
                  </div>
                </div>
                <Link href={journeyMapHref} className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-secondary px-4 py-3 text-[13px] font-black text-white shadow-lg shadow-secondary/20 transition-transform active:scale-95">
                  <MapPinned size={16} className="mr-2" />
                  지도에서 여정 보기
                </Link>
              </>
            ) : (
              <div className="mt-5 rounded-[24px] border border-dashed border-secondary/25 bg-background/60 p-4">
                <p className="text-[13px] font-black text-foreground/70">연결할 좌표가 더 필요해요.</p>
                <p className="mt-1 text-[12px] font-bold leading-relaxed text-foreground/45">장소가 담긴 기록이 2개 이상 모이면 지도에서 선으로 이어볼 수 있어요.</p>
              </div>
            )}
          </div>
        </section>

        {/* 9. [NEW] 동네 소식 Feed (Community Feed) */}
        <section className="pt-2">
          <div className="flex items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Community Feed"
              title="가볼 이유 찾기"
              description="동네 사람들이 남긴 짧은 이유와 반응입니다."
            />
            <Link
              href="/news"
              className="mb-0.5 flex shrink-0 items-center text-[12px] font-black text-secondary hover:underline"
            >
              전체보기 <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <div className="flex shrink-0 rounded-xl bg-foreground/5 p-1">
              <button onClick={() => setViewMode("list")} className={`rounded-lg p-1.5 ${viewMode === "list" ? "bg-card-bg text-secondary shadow-sm" : "text-foreground/40"}`} aria-label="목록 보기">
                <List size={16} />
              </button>
              <button onClick={() => setViewMode("grid")} className={`rounded-lg p-1.5 ${viewMode === "grid" ? "bg-card-bg text-secondary shadow-sm" : "text-foreground/40"}`} aria-label="격자 보기">
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          <div className={`mt-4 ${viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}`}>
            {isLoadingPosts ? (
              [1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-[24px] bg-foreground/5" />)
            ) : posts.length > 0 ? (
              posts.slice(0, 4).map((post) => (
                <FeedItem 
                  key={post.id} 
                  post={post} 
                  onClick={() => openBottomSheet("postDetail", { ...post })} 
                />
              ))
            ) : (
              <div className="rounded-[28px] border-2 border-dashed border-foreground/5 py-12 text-center text-[13px] font-black text-foreground/25">
                아직 올라온 동네 소식이 없습니다.
              </div>
            )}
          </div>
        </section>

        {/* 10. Settings (테마/로그아웃 설정) */}
        <section className="rounded-[28px] border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary">Settings</p>
              <h3 className="mt-1 text-[20px] font-black">설정</h3>
            </div>
            <Settings size={20} className="text-secondary" />
          </div>
          <button onClick={toggleTheme} className="flex w-full items-center justify-between rounded-2xl bg-foreground/5 p-4 transition-all hover:bg-foreground/10 active:scale-95">
            <div className="flex items-center gap-3">
              <div className="text-secondary">{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</div>
              <span className="text-[14px] font-bold">테마 설정</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-foreground/40">{theme === "light" ? "라이트 모드" : "다크 모드"}</span>
              <ArrowRight size={14} className="text-foreground/20" />
            </div>
          </button>

          {isAuthenticated && (
            <button
              onClick={async () => {
                if (confirm("로그아웃 하시겠습니까?")) {
                  try {
                    await signOut();
                    window.location.href = "/";
                  } catch (err) {
                    console.error("Logout failed:", err);
                    window.location.href = "/";
                  }
                }
              }}
              className="mt-3 flex w-full items-center justify-between rounded-2xl bg-rose-500/5 p-4 transition-all hover:bg-rose-500/10 active:scale-95"
            >
              <div className="flex items-center gap-3">
                <div className="text-rose-500"><LogOut size={18} /></div>
                <span className="text-[14px] font-bold text-rose-500">로그아웃</span>
              </div>
              <ArrowRight size={14} className="text-rose-500/20" />
            </button>
          )}
        </section>
      </main>
    </div>
  );
}

// 이관된 헬퍼 컴포넌트들

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-secondary">{eyebrow}</p>
      <h2 className="mt-1.5 text-[22px] font-black leading-tight text-foreground">{title}</h2>
      {description && <p className="mt-1.5 text-[12px] font-semibold leading-relaxed text-foreground/45">{description}</p>}
    </div>
  );
}

function buildMapHref(title: string, address?: string, latitude?: number, longitude?: number) {
  if (!latitude || !longitude) return "/map";
  const params = new URLSearchParams({ lat: String(latitude), lng: String(longitude), title, address: address || "" });
  return `/map?${params.toString()}`;
}

function DiscoveryCard({
  item,
  onSave,
  onRequest,
}: {
  item: typeof DISCOVERY_CARDS[number];
  onSave: () => void;
  onRequest: () => void;
}) {
  const mapHref = buildMapHref(item.place, item.address, item.lat, item.lng);

  return (
    <article className="w-[312px] shrink-0 snap-start overflow-hidden rounded-[26px] border border-border bg-card-bg shadow-sm">
      <div
        className="relative h-36 bg-cover bg-center"
        style={{ backgroundImage: `url(${item.imageUrl})` }}
      >
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-foreground shadow-sm">{item.type}</span>
          <span className="inline-flex items-center rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur-md">
            {item.category === "행사" && <PartyPopper size={10} className="mr-1 text-white" />}
            {item.category === "카페" && <Coffee size={10} className="mr-1 text-white" />}
            {item.category === "산책" && <Trees size={10} className="mr-1 text-white" />}
            {item.category}
          </span>
        </div>
        <div className="absolute bottom-3 right-3">
          <StatusBadge status={item.status} updated={item.updated} />
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-[17px] font-black leading-tight text-foreground">{item.title}</h3>
        <p className="mt-1 text-[12px] font-bold text-foreground/45">{item.place}</p>

        <p className="mt-3 line-clamp-2 text-[13px] font-medium leading-relaxed text-foreground/62">{item.summary}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-bold text-foreground/55">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button onClick={onSave} className="rounded-2xl bg-foreground/5 px-2 py-3 text-[12px] font-black text-foreground">
            기록
          </button>
          <button onClick={onRequest} className="rounded-2xl bg-accent px-2 py-3 text-[12px] font-black text-white shadow-sm">
            요청
          </button>
          <Link href={mapHref} className="inline-flex items-center justify-center rounded-2xl bg-foreground px-2 py-3 text-[12px] font-black text-background shadow-sm">
            상태
          </Link>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status, updated }: { status: DiscoveryStatus; updated: string }) {
  const styles: Record<DiscoveryStatus, string> = {
    혼잡: "bg-rose-50 text-rose-700 border-rose-200",
    보통: "bg-amber-50 text-amber-700 border-amber-200",
    여유: "bg-emerald-50 text-emerald-700 border-emerald-200",
    요청: "bg-sky-50 text-sky-700 border-sky-200",
  };

  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black shadow-sm ${styles[status]}`}>
      {status} · {updated}
    </span>
  );
}

function FeedItem({ post, onClick }: { post: Post; onClick: () => void }) {
  const trust = getTrustLevel(post.score || 0.5);

  return (
    <motion.article whileHover={{ y: -3 }} className="flex cursor-pointer flex-col rounded-[24px] border border-border bg-card-bg p-5 shadow-sm" onClick={onClick}>
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex items-center rounded-full px-2 py-0.5 text-[9px] font-black ${trust.color}`}>
          {trust.icon}
          <span className="ml-1">{trust.label}</span>
        </div>
        <span className="text-[10px] font-bold text-foreground/40">{new Date(post.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      <h3 className="mb-2 line-clamp-2 text-[15px] font-black leading-tight">{post.title || post.content}</h3>
      <p className="line-clamp-2 text-[12px] leading-relaxed text-foreground/55">{post.content}</p>

      <div className="mt-4 flex items-center gap-3 text-[10px] font-bold text-foreground/40">
        <span className="flex items-center">
          <TrendingUp size={10} className="mr-0.5 text-secondary" /> {post.likes_count}
        </span>
        <span className="flex items-center">
          <MessageSquare size={10} className="mr-0.5 text-secondary" /> {post.comments_count}
        </span>
        <span className="flex-1 truncate text-right text-[9px] text-foreground/28">#{post.category}</span>
      </div>
    </motion.article>
  );
}

function getTrustLevel(score: number) {
  if (score >= 0.8) {
    return { label: "신뢰 높음", color: "bg-sky-500/10 text-sky-600", icon: <ShieldCheck size={10} /> };
  }

  if (score >= 0.5) {
    return { label: "보통 신뢰", color: "bg-emerald-500/10 text-emerald-600", icon: <Star size={10} /> };
  }

  return { label: "확인 필요", color: "bg-amber-500/10 text-amber-600", icon: <ShieldCheck size={10} /> };
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card-bg/80 px-3 py-3 text-center shadow-sm">
      <p className="text-[10px] font-bold text-foreground/45">{label}</p>
      <p className="mt-1 text-[14px] font-black">{value}</p>
    </div>
  );
}

function EmptyBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-4 rounded-[24px] border border-dashed border-border bg-foreground/5 px-4 py-5">
      <p className="text-[15px] font-black">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-foreground/55">{description}</p>
    </div>
  );
}

function buildMemoryMapHref(memory: AlbumMemory) {
  if (!memory.latitude || !memory.longitude) return "";
  const params = new URLSearchParams({
    lat: String(memory.latitude),
    lng: String(memory.longitude),
    title: memory.title,
    address: memory.address || memory.locationLabel || "",
  });
  return `/map?${params.toString()}`;
}

function getMemoryTypeLabel(type: AlbumMemory["type"]) {
  if (type === "status") return "상태공유";
  if (type === "place") return "기록한 장소";
  return "동네 소식";
}

function MemoryHero({ memory }: { memory: AlbumMemory }) {
  const mapHref = buildMemoryMapHref(memory);
  return (
    <div className="mt-4 overflow-hidden rounded-[24px] border border-border">
      <div className="relative h-52">
        <Image src={memory.image} alt={memory.title} fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="rounded-full bg-white/20 px-2.5 py-1 backdrop-blur-md">{memory.statusLabel || memory.subtitle}</span>
            <span className="rounded-full bg-black/25 px-2.5 py-1 backdrop-blur-md">{formatTime(memory.createdAt)}</span>
          </div>
          <h4 className="mt-3 text-[22px] font-black leading-tight">{memory.title}</h4>
          <p className="mt-1 text-[13px] text-white/80">{memory.locationLabel || memory.subtitle}</p>
          {mapHref && (
            <Link href={mapHref} className="mt-3 inline-flex items-center rounded-2xl bg-white px-3 py-2 text-[12px] font-black text-secondary">
              <MapPinned size={14} className="mr-1.5" />
              지도에서 보기
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function MemoryListCard({ memory, onFavoriteToggle }: { memory: AlbumMemory; onFavoriteToggle: () => void }) {
  const mapHref = buildMemoryMapHref(memory);
  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-card-bg shadow-sm">
      <div className="flex gap-3 p-3">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[20px]">
          <Image src={memory.image} alt={memory.title} fill className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-secondary/80">{getMemoryTypeLabel(memory.type)}</p>
              <h4 className="mt-1 truncate text-[16px] font-black">{memory.title}</h4>
            </div>
            <button type="button" onClick={onFavoriteToggle} className={`rounded-full p-2 ${memory.favorite ? "bg-secondary/10 text-secondary" : "bg-foreground/5 text-foreground/40"}`} aria-label="즐겨찾기">
              <Heart size={16} fill={memory.favorite ? "currentColor" : "none"} />
            </button>
          </div>
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-foreground/60">{memory.description}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="truncate text-[11px] font-bold text-foreground/45">{memory.locationLabel}</span>
            <span className="text-[11px] font-bold text-foreground/35">{formatTime(memory.createdAt)}</span>
          </div>
          {mapHref && (
            <Link href={mapHref} className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-foreground/5 px-3 py-2 text-[12px] font-black text-foreground/60">
              <MapPinned size={14} className="mr-1.5 text-secondary" />
              지도에서 보기
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
