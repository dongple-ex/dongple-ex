"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, Footprints, Heart, MapPinned, Moon, Route, Settings, Share2, Star, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";
import { AlbumMemory, getAlbumMemories, subscribeAlbumMemories, toggleAlbumFavorite } from "@/lib/albumMemory";

type AlbumFilter = "all" | "status" | "post" | "place" | "favorite";

const FILTERS: { key: AlbumFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "status", label: "상태공유" },
  { key: "post", label: "소식" },
  { key: "place", label: "장소" },
  { key: "favorite", label: "즐겨찾기" },
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
  const { publicId, profile, initAuth } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const [memories, setMemories] = useState<AlbumMemory[]>([]);
  const [activeFilter, setActiveFilter] = useState<AlbumFilter>("all");

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    const sync = () => setMemories(getAlbumMemories());
    sync();
    return subscribeAlbumMemories(sync);
  }, []);

  const filteredMemories = useMemo(() => {
    if (activeFilter === "favorite") return memories.filter((item) => item.favorite);
    if (activeFilter === "all") return memories;
    return memories.filter((item) => item.type === activeFilter);
  }, [activeFilter, memories]);

  const favoriteMemories = useMemo(() => memories.filter((item) => item.favorite).slice(0, 3), [memories]);
  const bestMemory = favoriteMemories[0] || memories[0];

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
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary">Memory Archive</p>
            <h1 className="mt-1 text-lg font-black">나의 내발문자</h1>
          </div>
          <button className="-mr-2 p-2 text-secondary transition-transform active:scale-95" aria-label="공유">
            <Share2 size={22} />
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-6 px-5 py-6">
        <section className="overflow-hidden rounded-[28px] border border-border bg-card-bg shadow-sm">
          <div className="bg-gradient-to-br from-secondary/10 via-card-bg to-accent/5 px-6 py-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary">Memory Loop</p>
                <h2 className="mt-2 text-[24px] font-black leading-tight">
                  {(profile?.nickname || `익명 ${publicId || "사용자"}`) + "님의"}
                  <br />
                  다시 가고 싶은 곳
                </h2>
                <p className="mt-3 text-[13px] leading-relaxed text-foreground/65">
                  소식에서 발견하고 지도에서 확인한 장소를 발문자처럼 모아둡니다. 다음 방문 때 필요한 맥락이 여기 남아요.
                </p>
              </div>
              <div className="rounded-2xl bg-foreground/5 p-3 text-secondary shadow-sm">
                <Footprints size={24} />
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

        <section className="rounded-[28px] border border-border bg-card-bg p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary">Memory Cards</p>
              <h3 className="mt-1 text-[20px] font-black">발문자로 모은 기록</h3>
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

        <section className="rounded-[28px] bg-secondary p-6 text-white shadow-xl shadow-secondary/20">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">Keep Exploring</p>
          <h3 className="mt-2 text-[22px] font-black leading-tight">
            오늘 좋았던 곳을
            <br />
            다음에도 다시 찾을 수 있게
          </h3>
          <p className="mt-3 text-[13px] leading-relaxed text-white/80">기록한 장소를 지도에서 다시 확인하고, 새로운 상태와 소식으로 이어가세요.</p>
          <div className="mt-5 flex gap-3">
            <Link href="/map" className="inline-flex flex-1 items-center justify-center rounded-2xl bg-white px-4 py-3 text-[13px] font-black text-secondary">
              <MapPinned size={16} className="mr-2" />
              지도 보기
            </Link>
            <Link href="/news" className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/20 px-4 py-3 text-[13px] font-black text-white">
              <Clock3 size={16} className="mr-2" />
              소식 보기
            </Link>
          </div>
        </section>

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
        </section>
      </main>
    </div>
  );
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
