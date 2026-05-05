"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Heart,
  LayoutGrid,
  List,
  MapPinned,
  MessageSquare,
  PencilLine,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

import HeroSection from "@/components/dashboard/v2/HeroSection";
import LiveBoardTickerv2 from "@/components/dashboard/v2/LiveBoardTickerv2";
import OfficialEventSection from "@/features/events/components/OfficialEventSection";
import { AlbumMemory, getAlbumMemories, saveAlbumMemory, subscribeAlbumMemories } from "@/lib/albumMemory";
import { getRecentMapPlaces, RecentMapPlace, subscribeRecentMapPlaces } from "@/lib/mapRecentPlaces";
import { useLocationStore } from "@/lib/store/locationStore";
import { useUIStore } from "@/lib/store/uiStore";
import { fetchPosts, Post, subscribePosts } from "@/services/postService";

const FLOW_STEPS = [
  { title: "1. 소식", text: "오늘 갈 만한 이유를 찾습니다.", icon: Search },
  { title: "2. 확인", text: "지도에서 지금 상태를 봅니다.", icon: MapPinned },
  { title: "3. 요청", text: "모르면 현장 공유를 부탁합니다.", icon: MessageSquare },
  { title: "4. 기록", text: "마음에 남은 곳을 저장합니다.", icon: PencilLine },
  { title: "5. 다시 보기", text: "나의 내발문자에서 꺼내봅니다.", icon: CheckCircle2 },
];

type DiscoveryStatus = "혼잡" | "보통" | "여유" | "요청";

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
    lat: 37.2878,
    lng: 127.0177,
    address: "경기 수원시 팔달구 수원천로392번길",
  },
];

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [memories, setMemories] = useState<AlbumMemory[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<RecentMapPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const openBottomSheet = useUIStore((state) => state.openBottomSheet);
  const regionName = useLocationStore((state) => state.regionName);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      setPosts(await fetchPosts(10));
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    const sub = subscribePosts(loadPosts);
    return () => {
      void sub.unsubscribe();
    };
  }, [regionName]);

  useEffect(() => {
    const syncMemories = () => setMemories(getAlbumMemories());
    const syncRecentPlaces = () => setRecentPlaces(getRecentMapPlaces());

    syncMemories();
    syncRecentPlaces();

    const unsubscribeMemories = subscribeAlbumMemories(syncMemories);
    const unsubscribeRecentPlaces = subscribeRecentMapPlaces(syncRecentPlaces);

    return () => {
      unsubscribeMemories();
      unsubscribeRecentPlaces();
    };
  }, []);

  const mapHubItems = useMemo(() => {
    const favorites = memories
      .filter((memory) => memory.favorite || memory.type === "place")
      .filter((memory) => memory.latitude && memory.longitude)
      .slice(0, 3)
      .map((memory) => ({
        id: `memory-${memory.id}`,
        title: memory.title,
        subtitle: memory.address || memory.locationLabel || "기록한 장소",
        href: buildMapHref(memory.title, memory.address || memory.locationLabel, memory.latitude, memory.longitude),
        icon: "favorite" as const,
      }));

    const recents = recentPlaces.slice(0, 3).map((place) => ({
      id: `recent-${place.id}`,
      title: place.title,
      subtitle: place.address || "최근 검색",
      href: buildMapHref(place.title, place.address, place.latitude, place.longitude),
      icon: "recent" as const,
    }));

    return [...favorites, ...recents]
      .filter((item, index, array) => array.findIndex((other) => other.href === item.href) === index)
      .slice(0, 3);
  }, [memories, recentPlaces]);

  const handleSaveDiscovery = (item: (typeof DISCOVERY_CARDS)[number]) => {
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

  const handleRequestDiscovery = (item: (typeof DISCOVERY_CARDS)[number]) => {
    openBottomSheet("liveCreate", {
      mode: "request",
      defaultPlaceName: item.place,
      address: item.address,
      latitude: item.lat,
      longitude: item.lng,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      <HeroSection />
      <LiveBoardTickerv2 />

      <section className="px-6 pt-5">
        <div className="rounded-[26px] border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-secondary">How it works</p>
            <h2 className="mt-1.5 text-[22px] font-black">내발문자는 이렇게 씁니다</h2>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-foreground/55">
              이 앱은 장소 추천 앱이 아니라, “갈 이유”와 “지금 상태”와 “다음에 다시 볼 기록”을 이어주는 앱입니다.
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {FLOW_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="min-w-[138px] rounded-2xl bg-nav-bg px-3 py-3">
                  <Icon size={16} className="text-secondary" />
                  <strong className="mt-2 block text-[13px] font-black">{step.title}</strong>
                  <span className="mt-1 block text-[12px] font-semibold leading-snug text-foreground/50">{step.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 pt-5">
        <div className="rounded-[26px] border border-border bg-card-bg p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-secondary">Today Discovery</p>
              <h2 className="mt-1.5 text-[22px] font-black">오늘 발견한 곳</h2>
              <p className="mt-2 text-[13px] font-medium leading-relaxed text-foreground/55">
                카드 하나에서 정보의 성격, 지금 상태, 다음 행동까지 바로 판단합니다.
              </p>
            </div>
            <MessageSquare className="mt-1 shrink-0 text-secondary" size={24} />
          </div>

          <div className="space-y-3">
            {DISCOVERY_CARDS.map((item) => (
              <DiscoveryCard
                key={item.id}
                item={item}
                onSave={() => handleSaveDiscovery(item)}
                onRequest={() => handleRequestDiscovery(item)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pt-5">
        <div className="rounded-[26px] border border-border bg-card-bg p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-secondary">Next Stop</p>
              <h2 className="mt-1.5 text-[22px] font-black">다시 볼 장소</h2>
              <p className="mt-2 text-[13px] font-medium text-foreground/55">검색했거나 저장한 장소를 지도에서 바로 이어봅니다.</p>
            </div>
            <MapPinned className="mt-1 shrink-0 text-secondary" size={26} />
          </div>

          {mapHubItems.length > 0 ? (
            <div className="mt-4 space-y-2">
              {mapHubItems.map((item) => (
                <Link key={item.id} href={item.href} className="flex items-center gap-3 rounded-2xl bg-nav-bg px-3.5 py-3 transition-colors hover:bg-foreground/5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card-bg text-secondary">
                    {item.icon === "favorite" ? <Heart size={16} fill="currentColor" /> : <Clock3 size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-black">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] font-bold text-foreground/45">{item.subtitle}</span>
                  </span>
                  <ArrowRight size={15} className="shrink-0 text-foreground/25" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-nav-bg/60 px-4 py-4">
              <p className="text-[13px] font-black text-foreground/65">아직 다시 볼 장소가 없어요.</p>
              <p className="mt-1 text-[12px] font-medium text-foreground/45">소식에서 가볼 곳을 찾거나 지도에서 장소를 검색하면 여기에 쌓입니다.</p>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <Link href="/map" className="inline-flex items-center justify-center rounded-2xl bg-foreground px-5 py-3 text-[13px] font-black text-background">
              지금 상태 확인하기
              <ArrowRight size={16} className="ml-2" />
            </Link>
            <button
              onClick={() => openBottomSheet("recordHub", { defaultTab: "request" })}
              className="inline-flex items-center justify-center rounded-2xl border border-border px-5 py-3 text-[13px] font-black text-foreground/70"
            >
              현장 공유 요청
            </button>
          </div>
        </div>
      </section>

      <div className="mt-5">
        <OfficialEventSection />
      </div>

      <section className="px-6 pb-4 pt-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Community Feed</p>
            <h2 className="mt-2 text-xl font-black">가볼 이유 찾기</h2>
          </div>
          <Link href="/news" className="text-[12px] font-black text-secondary">
            전체 보기
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-bold leading-relaxed text-foreground/45">
            소식은 최종 목적지가 아니라 출발점입니다. 마음에 드는 글을 열고 지도에서 지금 상태를 확인하세요.
          </p>
          <div className="flex shrink-0 rounded-xl bg-foreground/5 p-1">
            <button onClick={() => setViewMode("list")} className={`rounded-lg p-1.5 ${viewMode === "list" ? "bg-card-bg text-secondary shadow-sm" : "text-foreground/40"}`} aria-label="목록 보기">
              <List size={16} />
            </button>
            <button onClick={() => setViewMode("grid")} className={`rounded-lg p-1.5 ${viewMode === "grid" ? "bg-card-bg text-secondary shadow-sm" : "text-foreground/40"}`} aria-label="격자 보기">
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        <div className={`mt-6 ${viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}`}>
          {isLoading ? (
            [1, 2, 3, 4].map((i) => <div key={i} className="h-32 animate-pulse rounded-[24px] bg-foreground/5" />)
          ) : posts.length > 0 ? (
            posts.map((post) => <FeedItem key={post.id} post={post} onClick={() => openBottomSheet("postDetail", { ...post })} />)
          ) : (
            <div className="rounded-[28px] border-2 border-dashed border-foreground/5 py-16 text-center text-[13px] font-black text-foreground/25">
              아직 올라온 동네 소식이 없습니다.
            </div>
          )}
        </div>
      </section>
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
  item: (typeof DISCOVERY_CARDS)[number];
  onSave: () => void;
  onRequest: () => void;
}) {
  const mapHref = buildMapHref(item.place, item.address, item.lat, item.lng);

  return (
    <article className="rounded-[24px] border border-border bg-nav-bg/55 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-card-bg px-2.5 py-1 text-[10px] font-black text-secondary shadow-sm">{item.type}</span>
            <span className="rounded-full bg-foreground/5 px-2.5 py-1 text-[10px] font-black text-foreground/45">{item.category}</span>
          </div>
          <h3 className="mt-3 text-[17px] font-black leading-tight text-foreground">{item.title}</h3>
          <p className="mt-1 text-[12px] font-bold text-foreground/45">{item.place}</p>
        </div>
        <StatusBadge status={item.status} updated={item.updated} />
      </div>

      <p className="mt-3 text-[13px] font-medium leading-relaxed text-foreground/62">{item.summary}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-border bg-card-bg px-2.5 py-1 text-[11px] font-bold text-foreground/55">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={onSave} className="rounded-2xl bg-card-bg px-3 py-3 text-[12px] font-black text-foreground shadow-sm">
          기록하기
        </button>
        <button onClick={onRequest} className="rounded-2xl bg-accent px-3 py-3 text-[12px] font-black text-white shadow-sm">
          상황요청
        </button>
        <Link href={mapHref} className="inline-flex items-center justify-center rounded-2xl bg-foreground px-3 py-3 text-[12px] font-black text-background shadow-sm">
          상태보기
        </Link>
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
    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${styles[status]}`}>
      {status} · {updated}
    </span>
  );
}

function FeedItem({ post, onClick }: { post: Post; onClick: () => void }) {
  const trust = getTrustLevel(post.score || 0.5);

  return (
    <motion.div whileHover={{ y: -3 }} className="flex cursor-pointer flex-col rounded-[24px] border border-border bg-card-bg p-5 shadow-sm" onClick={onClick}>
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
    </motion.div>
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
