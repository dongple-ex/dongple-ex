"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ArrowDown,
  ArrowRight,
  CircleCheck,
  CircleX,
  PartyPopper,
  Radio,
  Compass
} from "lucide-react";
import Link from "next/link";

import HeroSection from "@/components/dashboard/v2/HeroSection";
import { useLocationStore } from "@/lib/store/locationStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useAuthStore } from "@/lib/store/authStore";
import { getPersistentUserId } from "@/lib/auth-utils";
import {
  fetchLiveStatus,
  isLiveStatusActive,
  formatUpdatedAgo,
  normalizeStatus,
  subscribeLiveUpdates,
  verifyStatusWithTrust,
  postLiveStatus,
  LiveStatus
} from "@/services/statusService";

const LOCATION_PROMPT_IMAGE =
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=900&auto=format&fit=crop";
const VERIFIED_LOCATION_FALLBACK_IMAGE =
  "https://www.suwon.go.kr/webcontent/ckeditor/2026/5/4/d88dc018-7cb8-429f-a49c-478f47654b43.jpg";

type TourLocationItem = {
  title?: string;
  thumbnail_url?: string;
  image_url?: string;
};

function sanitizeLocationText(value?: string | null) {
  const trimmed = value?.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  const invalidHints = ["내 주변", "서비스 로드 중", "주소 정보 없음", "위치 확인", "Geolocation", "Failed"];
  if (invalidHints.some((hint) => trimmed.includes(hint))) return "";

  return trimmed;
}

function getVerifiedPlaceName(address?: string | null, regionName?: string | null) {
  const region = sanitizeLocationText(regionName);
  if (region) {
    const parts = region.split(" ").filter(Boolean);
    return parts.length > 2 ? parts.slice(-2).join(" ") : region;
  }

  return sanitizeLocationText(address);
}

export default function Home() {
  const openBottomSheet = useUIStore((state) => state.openBottomSheet);
  const { userId } = useAuthStore();
  const { latitude: storeLat, longitude: storeLng, address: storeAddress, regionName: storeRegionName, fetchLocation } = useLocationStore();

  const [liveStatuses, setLiveStatuses] = useState<LiveStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // 위치 인증 및 미니 제보 관련 상태
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [miniPlaceName, setMiniPlaceName] = useState("");
  const [miniStatus, setMiniStatus] = useState("보통");
  const [miniMessage, setMiniMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmittingMini, setIsSubmittingMini] = useState(false);
  const [locationHeroImage, setLocationHeroImage] = useState(VERIFIED_LOCATION_FALLBACK_IMAGE);
  const [locationHeroTitle, setLocationHeroTitle] = useState("");

  // Default coordinates fallback: Suwon Hwaseong area
  const userLat = storeLat || 37.2995;
  const userLng = storeLng || 126.9912;
  const verifiedPlaceDisplay = getVerifiedPlaceName(storeAddress, storeRegionName);
  const verifiedAddressText = sanitizeLocationText(storeAddress);
  const canSubmitMini = miniPlaceName.trim().length > 0 && !isSubmittingMini;

  const loadData = async () => {
    try {
      const statusData = await fetchLiveStatus(true);
      setLiveStatuses(statusData);
    } catch (error) {
      console.error("[Home] Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRepresentativeLocationImage = async (lat: number, lng: number) => {
    const params = new URLSearchParams({
      mapX: String(lng),
      mapY: String(lat),
      radius: "5000",
      numOfRows: "20",
    });

    const response = await fetch(`/api/tour/location?${params.toString()}`);
    if (!response.ok) return;

    const data = await response.json();
    const items: TourLocationItem[] = Array.isArray(data.items) ? data.items : [];
    const representative = items.find((item) => item.thumbnail_url || item.image_url);

    if (representative?.thumbnail_url || representative?.image_url) {
      setLocationHeroImage(representative.thumbnail_url || representative.image_url || VERIFIED_LOCATION_FALLBACK_IMAGE);
      setLocationHeroTitle(representative.title || "");
    }
  };

  const handleVerifyLocation = async () => {
    setIsLocating(true);
    try {
      await fetchLocation();

      const locationState = useLocationStore.getState();
      const verifiedPlaceName = getVerifiedPlaceName(locationState.address, locationState.regionName);

      if (!verifiedPlaceName || locationState.error) {
        setIsLocationVerified(false);
        setMiniPlaceName("");
        alert("위치 인증으로 장소명을 확인하지 못했습니다. 장소 이름을 직접 입력해주세요.");
        return;
      }

      setIsLocationVerified(true);
      setMiniPlaceName(verifiedPlaceName);
    } catch (error) {
      console.error("[Home] Location verification failed:", error);
      alert("위치 정보를 가져오는 데 실패했습니다. GPS 권한을 확인해 주세요.");
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    if (!isLocationVerified) return;
    void loadRepresentativeLocationImage(userLat, userLng);
  }, [isLocationVerified, userLat, userLng]);

  const handleMiniSubmit = async () => {
    const placeName = miniPlaceName.trim();
    if (!placeName) {
      alert("장소 이름을 입력해주세요.");
      return;
    }
    setIsSubmittingMini(true);
    try {
      const finalUserId = userId || getPersistentUserId();
      const nextStatusColor =
        miniStatus === "여유" ? "text-emerald-500" : miniStatus === "보통" ? "text-amber-500" : "text-rose-500";
      const locationState = useLocationStore.getState();
      const hasVerifiedCoords =
        isLocationVerified &&
        Number.isFinite(locationState.latitude) &&
        Number.isFinite(locationState.longitude);

      await postLiveStatus({
        place_name: placeName,
        category: "기타",
        status: miniStatus,
        status_color: nextStatusColor,
        is_request: false,
        verified_count: isLocationVerified ? 1 : 0,
        latitude: hasVerifiedCoords ? locationState.latitude : undefined,
        longitude: hasVerifiedCoords ? locationState.longitude : undefined,
        message: miniMessage.trim(),
        user_id: finalUserId,
      });

      const todayStr = new Date().toDateString();
      localStorage.setItem(`shared_today_${todayStr}`, "true");
      setHasSubmittedToday(true);
      await loadData();
      alert("상황 공유가 등록되었습니다!");
    } catch (error) {
      console.error("[Home] Mini submit failed:", error);
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingMini(false);
    }
  };

  useEffect(() => {
    loadData();
    const statusSub = subscribeLiveUpdates(loadData);
    const timeTimer = setInterval(() => setNow(Date.now()), 30000);

    return () => {
      statusSub.unsubscribe();
      clearInterval(timeTimer);
    };
  }, []);

  // 1. 🔥 내 주변 상태 요약 (반경 2km) -> HeroSection에 전달됨
  const neighborhoodSummary = useMemo(() => {
    const nearbyItems = liveStatuses.filter((item) => {
      if (!item.latitude || !item.longitude) return false;
      const dLat = (item.latitude - userLat) * (Math.PI / 180);
      const dLon = (item.longitude - userLng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(userLat * (Math.PI / 180)) *
        Math.cos(item.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = 6371 * c; // Distance in km
      return dist <= 2.0;
    });

    const activeNearby = nearbyItems.filter((item) => isLiveStatusActive(item, now));
    const crowdedCount = activeNearby.filter((item) => normalizeStatus(item.status) === "혼잡").length;
    const normalCount = activeNearby.filter((item) => normalizeStatus(item.status) === "보통").length;
    const pleasantCount = activeNearby.filter((item) => normalizeStatus(item.status) === "여유").length;

    return {
      total: activeNearby.length,
      crowded: crowdedCount,
      normal: normalCount,
      pleasant: pleasantCount
    };
  }, [liveStatuses, userLat, userLng, now]);

  // 2. ⚡ 지금 올라오는 상황 (실시간 상황판) -> HeroSection에 전달됨
  const liveTickerUpdates = useMemo(() => {
    return liveStatuses
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);
  }, [liveStatuses]);

  // 3. 카드 2 용 최신 실시간 리포트 (답변/검증 카드용)
  // 가장 최신의 active 상태이면서 is_request가 아닌 일반 제보 리포트 1개를 가져옵니다.
  const latestActiveReport = useMemo(() => {
    return liveStatuses.find((item) => isLiveStatusActive(item, now) && !item.is_request) || null;
  }, [liveStatuses, now]);

  // API 호출 핸들러: 최신 상태 '맞아요' 검증
  const handleVerifyStatus = async (statusId: string) => {
    const finalUserId = userId || getPersistentUserId();
    try {
      const success = await verifyStatusWithTrust(statusId, finalUserId);
      if (success) {
        await loadData();
        alert("확인이 반영되었습니다!");
      } else {
        alert("이미 확인하셨거나 처리 중 문제가 생겼습니다.");
      }
    } catch (error) {
      console.error("[Home] Verify failed:", error);
      alert("이미 확인하셨거나 오류가 발생했습니다.");
    }
  };

  // API 호출 핸들러: 최신 상태 '달라요' 갱신
  const handleDisagreeStatus = (current: LiveStatus) => {
    const defaultStatus = normalizeStatus(current.status) === "여유" ? "보통" : "여유";

    openBottomSheet("liveReply", {
      mode: "disagree",
      defaultStatus,
      onSubmit: async ({ selectedStatus, replyText }: { selectedStatus: string; replyText: string }) => {
        const nextStatusColor =
          selectedStatus === "여유" ? "text-emerald-500" : selectedStatus === "보통" ? "text-amber-500" : "text-rose-500";

        const finalUserId = userId || getPersistentUserId();

        await postLiveStatus({
          place_name: current.place_name,
          category: current.category || "동네생활",
          status: selectedStatus,
          status_color: nextStatusColor,
          is_request: false,
          verified_count: 1,
          latitude: current.latitude,
          longitude: current.longitude,
          message: replyText,
          user_id: finalUserId,
        });

        loadData();
      },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      {/* 자개 무늬 배너 헤더 */}
      <HeroSection neighborhoodSummary={neighborhoodSummary} liveTickerUpdates={liveTickerUpdates} />

      {/* 1. 상단 타이틀 영역 */}
      <section className="mx-auto max-w-md px-5 pt-5 pb-1 md:max-w-[1120px] md:px-6">
        <h1 className="text-[24px] font-black leading-tight tracking-tight text-foreground">
          지금{" "}
          <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">여기는?</span>
        </h1>
      </section>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary/20 border-t-secondary" />
        </div>
      ) : (
        <div className="mx-auto mt-3 grid max-w-md grid-cols-1 gap-4 px-5 md:max-w-[1120px] md:grid-cols-2 md:px-6">

          {/* 카드 1: 내가 있는 곳의 상황 남기기 (위치 인증 및 미니 폼 내장형) */}
          {hasSubmittedToday ? (
            /* [상태 3] 제보 완료 후 */
            <article className="w-full overflow-hidden rounded-[22px] border border-border bg-card-bg shadow-sm transition-all hover:shadow-md">
              <div
                className="relative h-28 bg-cover bg-center"
                style={{
                  backgroundImage: `url('${locationHeroImage}')`
                }}
              >
                <div className="absolute inset-0 bg-black/35" />
                {locationHeroTitle && (
                  <div className="absolute bottom-3.5 left-3.5 max-w-[58%] truncate rounded-full bg-black/35 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-md">
                    {locationHeroTitle}
                  </div>
                )}
                <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-2">
                  <span className="max-w-[180px] truncate rounded-full bg-[#e9ecef] px-3 py-1.5 text-[11px] font-black text-[#17201b] shadow-sm">
                    {miniPlaceName.trim() || "공유 완료"}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50/90 text-emerald-700 px-3 py-1.5 text-[11px] font-black backdrop-blur-md shadow-sm">
                    제보 완료
                  </span>
                </div>
                <div className="absolute bottom-3.5 right-3.5">
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 text-[11px] font-black shadow-sm">
                    인증 완료
                  </span>
                </div>
              </div>

              <div className="p-3.5">
                <div>
                  <h3 className="text-[17px] font-black leading-snug text-foreground break-keep">
                    오늘의 현장 제보를 완료했습니다! 🎉
                  </h3>
                  <p className="mt-1 text-[12px] font-bold text-foreground/45">정자동 부근</p>

                  <p className="mt-4 text-[13px] font-medium leading-relaxed text-foreground/60 break-keep">
                    작성해주신 제보가 이웃들에게 실시간으로 공유되고 있습니다. 쾌적한 동네 생활을 위해 함께 참여해 주셔서 대단히 감사합니다.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-gray-100 bg-gray-50/50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                      #제보_완료
                    </span>
                    <span className="rounded-full border border-gray-100 bg-gray-50/50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                      #동네_히어로
                    </span>
                    <span className="rounded-full border border-gray-100 bg-gray-50/50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                      #정보_나눔
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setHasSubmittedToday(false)}
                    className="w-20 text-left text-[14px] font-black text-foreground hover:opacity-80 transition-all cursor-pointer bg-transparent border-0"
                  >
                    추가 제보
                  </button>
                  <Link
                    href="/map"
                    className="flex-1 max-w-[150px] mx-auto text-center bg-[#a17a55] text-white text-[14px] font-black py-2.5 px-5 rounded-[20px] shadow-sm hover:bg-[#8e6946] active:scale-95 transition-all"
                  >
                    지도 보기
                  </Link>
                  <Link
                    href="/me"
                    className="w-20 text-right text-[14px] font-black text-foreground hover:opacity-80 transition-all"
                  >
                    내역 보기
                  </Link>
                </div>
              </div>
            </article>
          ) : !isLocationVerified ? (
            /* [상태 1] 위치 인증 전 */
            <article className="w-full overflow-hidden rounded-[22px] border border-border bg-card-bg shadow-sm transition-all hover:shadow-md">
              <div
                className="relative h-32 bg-cover bg-center"
                style={{
                  backgroundImage: `url('${LOCATION_PROMPT_IMAGE}')`
                }}
              >
                <div className="absolute inset-0 bg-black/35" />
                <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#e9ecef] px-3 py-1.5 text-[11px] font-black text-[#17201b] shadow-sm">
                    궁금해요?
                  </span>
                  <span className="inline-flex items-center rounded-full bg-amber-50/90 text-amber-700 px-3 py-1.5 text-[11px] font-black backdrop-blur-md shadow-sm">
                    인증 대기
                  </span>
                </div>
                <div className="absolute bottom-3.5 right-3.5">
                  <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-3.5 py-1.5 text-[11px] font-black shadow-sm animate-pulse">
                    직접 입력 가능
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex max-w-full items-center gap-1.5 rounded-[18px] bg-secondary/10 px-3 py-1.5 text-[11px] font-black leading-snug text-secondary">
                      <Compass size={12} className="shrink-0 animate-spin-slow" />
                      <span>지금 바로 장소를 입력하고 상황을 공유해 봐요.</span>
                    </p>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                    <ArrowDown size={18} className="animate-bounce" />
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-[11px] font-black text-foreground/45">장소 이름</label>
                      <span className="text-[10px] font-black text-amber-600">미인증 시 직접 입력</span>
                    </div>
                    <input
                      type="text"
                      value={miniPlaceName}
                      onChange={(e) => setMiniPlaceName(e.target.value)}
                      placeholder="어디에 계신가요? (예: 행궁 광장)"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[14px] font-medium text-foreground shadow-inner focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] font-black text-foreground/45">혼잡도</span>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {["여유", "보통", "혼잡"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setMiniStatus(status)}
                          className={`rounded-xl border py-2 text-center text-[12px] font-black transition-all ${miniStatus === status
                            ? status === "여유"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm"
                              : status === "혼잡"
                                ? "border-rose-300 bg-rose-50 text-rose-700 shadow-sm"
                                : "border-amber-300 bg-amber-50 text-amber-700 shadow-sm"
                            : "border-border bg-background/70 text-foreground/45 hover:bg-background"
                            }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-foreground/45 mb-1">상황 한 줄 요약</label>
                    <input
                      type="text"
                      value={miniMessage}
                      onChange={(e) => setMiniMessage(e.target.value)}
                      placeholder="현재 상황은 어떤가요? (예: 대기 없음)"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[14px] font-medium text-foreground shadow-inner focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[1fr_1.15fr] gap-2">
                  <button
                    onClick={handleVerifyLocation}
                    disabled={isLocating || isSubmittingMini}
                    className="rounded-[20px] border border-secondary/20 bg-secondary/10 px-3 py-2.5 text-[12px] font-black text-secondary transition-all active:scale-95 disabled:opacity-60"
                  >
                    {isLocating ? "인증 중..." : "위치 인증"}
                  </button>
                  <button
                    onClick={handleMiniSubmit}
                    disabled={!canSubmitMini}
                    className="flex items-center justify-center rounded-[20px] bg-[#a17a55] px-4 py-2.5 text-[14px] font-black text-white shadow-sm transition-all hover:bg-[#8e6946] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSubmittingMini ? "등록 중..." : "제보 완료"}
                    {!isSubmittingMini && <ArrowRight size={16} className="ml-2" />}
                  </button>
                </div>
              </div>
            </article>
          ) : (
            /* [상태 2] 위치 인증 완료 (미니 제보 폼 내장형) */
            <article className="w-full overflow-hidden rounded-[22px] border border-border bg-card-bg shadow-sm transition-all hover:shadow-md">
              <div
                className="relative h-32 bg-cover bg-center"
                style={{
                  backgroundImage: `url('${locationHeroImage}')`
                }}
              >
                <div className="absolute inset-0 bg-black/35" />
                <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-2">
                  <span className="max-w-[180px] truncate rounded-full bg-[#e9ecef] px-3 py-1.5 text-[11px] font-black text-[#17201b] shadow-sm">
                    {miniPlaceName.trim() || verifiedPlaceDisplay || "장소 입력 필요"}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50/90 text-emerald-700 px-3 py-1.5 text-[11px] font-black backdrop-blur-md shadow-sm">
                    위치 인증됨
                  </span>
                </div>
                <div className="absolute bottom-3.5 right-3.5">
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 text-[11px] font-black shadow-sm">
                    GPS 수신 정상
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-foreground/45 mb-1">장소 이름</label>
                    <input
                      type="text"
                      value={miniPlaceName}
                      onChange={(e) => setMiniPlaceName(e.target.value)}
                      placeholder="어디에 계신가요? (예: 행궁 광장)"
                      className="w-full px-3.5 py-2.5 text-[14px] font-medium rounded-xl border border-border bg-background focus:outline-none focus:border-accent text-foreground shadow-inner"
                    />
                    {verifiedAddressText && (
                      <p className="ml-1 mt-1 text-[10px] text-foreground/40">
                        인증 위치: {verifiedAddressText}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-foreground/45 mb-1">혼잡도 상태</label>
                    <div className="flex gap-2">
                      {["여유", "보통", "혼잡"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setMiniStatus(status)}
                          className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${miniStatus === status
                            ? status === "여유"
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-extrabold shadow-sm"
                              : status === "혼잡"
                                ? "bg-rose-50 border-rose-300 text-rose-700 font-extrabold shadow-sm"
                                : "bg-amber-50 border-amber-300 text-amber-700 font-extrabold shadow-sm"
                            : "border-border bg-background/50 text-foreground/50 hover:bg-background"
                            }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-foreground/45 mb-1">상황 한 줄 요약</label>
                    <input
                      type="text"
                      value={miniMessage}
                      onChange={(e) => setMiniMessage(e.target.value)}
                      placeholder="현재 상황은 어떤가요? (예: 대기 없음)"
                      className="w-full px-3.5 py-2.5 text-[14px] font-medium rounded-xl border border-border bg-background focus:outline-none focus:border-accent text-foreground shadow-inner"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setIsLocationVerified(false)}
                    className="w-20 text-left text-[14px] font-black text-foreground hover:opacity-80 transition-all cursor-pointer bg-transparent border-0"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleMiniSubmit}
                    disabled={!canSubmitMini}
                    className="flex-1 max-w-[150px] mx-auto text-center bg-[#a17a55] text-white text-[14px] font-black py-2.5 px-5 rounded-[20px] shadow-sm hover:bg-[#8e6946] active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSubmittingMini ? "등록 중..." : "제보 완료"}
                  </button>
                  <span className="w-20 text-right text-[14px] font-black text-foreground/30 select-none">
                    상태
                  </span>
                </div>
              </div>
            </article>
          )}

          {/* 카드 2: 다른 사람이 올린 최신 상태에 바로 답변해주기 */}
          {latestActiveReport ? (
            <article className="w-full overflow-hidden rounded-[22px] border border-border bg-card-bg shadow-sm transition-all hover:shadow-md">
              <div
                className="relative h-32 bg-cover bg-center"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=900')"
                }}
              >
                <div className="absolute inset-0 bg-black/35" />
                <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#e9ecef] px-3 py-1.5 text-[11px] font-black text-[#17201b] shadow-sm">
                    팩트체크
                  </span>
                  <span className="inline-flex items-center rounded-full bg-black/35 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-md">
                    <Radio size={11} className="mr-1 text-white animate-pulse" />
                    실시간
                  </span>
                </div>
                <div className="absolute bottom-3.5 right-3.5">
                  <span className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-black shadow-sm ${normalizeStatus(latestActiveReport.status) === "혼잡"
                    ? "bg-[#fff5f5] border-[#ffc9c9] text-[#fa5252]"
                    : normalizeStatus(latestActiveReport.status) === "여유"
                      ? "bg-[#e6fcf5] border-[#c3fae8] text-[#099268]"
                      : "bg-[#fff9db] border-[#ffe066] text-[#f08c00]"
                    }`}>
                    {normalizeStatus(latestActiveReport.status)} · {formatUpdatedAgo(latestActiveReport.created_at)}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div>
                  <p className="inline-flex max-w-full items-center gap-1.5 rounded-[18px] bg-secondary/10 px-3 py-1.5 text-[11px] font-black leading-snug text-secondary">
                    <Compass size={12} className="shrink-0 animate-spin-slow" />
                    <span>{latestActiveReport.place_name}, 지금 가도 정말 {normalizeStatus(latestActiveReport.status)}한가요?</span>
                  </p>

                  <p className="mt-4 text-[13px] font-medium leading-relaxed text-foreground/60 break-keep">
                    &quot;{latestActiveReport.message || "새로운 현장 상황 정보가 올라왔습니다. 현장 정보가 실제와 맞는지 지금 바로 답변해 주세요."}&quot;
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-gray-100 bg-gray-50/50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                      #현장_검증
                    </span>
                    <span className="rounded-full border border-gray-100 bg-gray-50/50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                      #팩트_체크
                    </span>
                    <span className="rounded-full border border-gray-100 bg-gray-50/50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                      #혼잡도_확인
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleVerifyStatus(latestActiveReport.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-[20px] border border-border bg-white px-3 py-2.5 text-[13px] font-black text-[#17201b] shadow-sm transition-all hover:bg-white/90 active:scale-95"
                  >
                    <CircleCheck size={15} />
                    맞아요
                  </button>
                  <button
                    onClick={() => handleDisagreeStatus(latestActiveReport)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-[20px] bg-rose-500 px-3 py-2.5 text-[13px] font-black text-white shadow-sm transition-all hover:bg-rose-600 active:scale-95"
                  >
                    <CircleX size={15} />
                    달라요
                  </button>
                  <Link
                    href={`/map?lat=${latestActiveReport.latitude}&lng=${latestActiveReport.longitude}&statusId=${latestActiveReport.id}&title=${encodeURIComponent(latestActiveReport.place_name)}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-[20px] bg-[#a17a55] px-3 py-2.5 text-[13px] font-black text-white shadow-sm transition-all hover:bg-[#8e6946] active:scale-95"
                  >
                    상태현황
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </article>
          ) : (
            /* Fallback Card: 최신 리포트가 없을 시 (스타필드/화성행궁 야간개장 예시) */
            <article className="w-full overflow-hidden rounded-[22px] border border-border bg-card-bg shadow-sm transition-all hover:shadow-md">
              <div
                className="relative h-32 bg-cover bg-center"
                style={{
                  backgroundImage: "url('https://www.suwon.go.kr/webcontent/ckeditor/2026/5/4/d88dc018-7cb8-429f-a49c-478f47654b43.jpg')"
                }}
              >
                <div className="absolute inset-0 bg-black/35" />
                <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#e9ecef] px-3 py-1.5 text-[11px] font-black text-[#17201b] shadow-sm">
                    공식+질문
                  </span>
                  <span className="inline-flex items-center rounded-full bg-black/35 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-md">
                    <PartyPopper size={11} className="mr-1 text-white" />
                    행사
                  </span>
                </div>
                <div className="absolute bottom-3.5 right-3.5">
                  <span className="shrink-0 rounded-full border border-[#ffc9c9] bg-[#fff5f5] text-[#fa5252] px-3.5 py-1.5 text-[11px] font-black shadow-sm">
                    혼잡 · 5분 전
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div>
                  <h3 className="text-[17px] font-black leading-snug text-foreground break-keep">
                    화성행궁 야간개장, 지금 가도 줄이 길까요?
                  </h3>
                  <p className="mt-1 text-[12px] font-bold text-foreground/45">수원 화성행궁</p>

                  <p className="mt-4 text-[13px] font-medium leading-relaxed text-foreground/60 break-keep">
                    공식 행사는 진행 중이고, 현장 공유 기준 입장 대기와 사진 명소 주변이 붐비는 편이에요.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-gray-100 bg-gray-50/50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                      #대기_있음
                    </span>
                    <span className="rounded-full border border-gray-100 bg-gray-50/50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                      #사진_명소
                    </span>
                    <span className="rounded-full border border-gray-100 bg-gray-50/50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                      #야간_행사
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => openBottomSheet("recordHub", { defaultTab: "record" })}
                    className="w-20 text-left text-[14px] font-black text-foreground hover:opacity-80 transition-all cursor-pointer bg-transparent border-0"
                  >
                    기록
                  </button>
                  <button
                    onClick={() => openBottomSheet("recordHub", { defaultTab: "request" })}
                    className="flex-1 max-w-[150px] mx-auto text-center bg-[#a17a55] text-white text-[14px] font-black py-2.5 px-5 rounded-[20px] shadow-sm hover:bg-[#8e6946] active:scale-95 transition-all"
                  >
                    요청
                  </button>
                  <Link
                    href={`/map?lat=37.2811&lng=127.0135&title=${encodeURIComponent("수원 화성행궁")}`}
                    className="w-20 text-right text-[14px] font-black text-foreground hover:opacity-80 transition-all"
                  >
                    상태
                  </Link>
                </div>
              </div>
            </article>
          )}

        </div>
      )}
    </div>
  );
}
