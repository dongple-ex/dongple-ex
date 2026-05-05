"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  Building2,
  Coffee,
  Dumbbell,
  HeartPulse,
  Home,
  MapPin,
  ParkingCircle,
  PartyPopper,
  ShoppingBag,
  Store,
  Trees,
} from "lucide-react";
import IdentityHeader from "@/features/auth/components/IdentityHeader";
import { saveAlbumMemory } from "@/lib/albumMemory";
import { useLocationStore } from "@/lib/store/locationStore";
import { useAuthStore } from "@/lib/store/authStore";
import { SHAREABLE_STATUS_OPTIONS } from "@/lib/statusTheme";
import { postLiveStatus } from "@/services/statusService";

const CATEGORIES = [
  { id: "행사", label: "행사", icon: PartyPopper },
  { id: "기타", label: "기타", icon: Home },
  { id: "공원", label: "공원", icon: Trees },
  { id: "운동", label: "운동", icon: Dumbbell },
  { id: "카페/식당", label: "카페/식당", icon: Coffee },
  { id: "마트", label: "마트", icon: ShoppingBag },
  { id: "편의점", label: "편의점", icon: Store },
  { id: "주차장", label: "주차장", icon: ParkingCircle },
  { id: "병원/약국", label: "병원/약국", icon: HeartPulse },
  { id: "공공기관", label: "공공기관", icon: Building2 },
];

interface LiveStatusCreateFormProps {
  mode?: "request" | "share";
  eventId?: string | number;
  defaultPlaceName?: string;
  currentAddress?: string;
  latitude?: number;
  longitude?: number;
  onSuccess?: () => void;
  compact?: boolean;
}

export default function LiveStatusCreateForm({
  mode = "share",
  eventId,
  defaultPlaceName,
  currentAddress: propAddress,
  latitude: propLat,
  longitude: propLng,
  onSuccess,
  compact = false,
}: LiveStatusCreateFormProps) {
  const { address: storeAddress, latitude: storeLat, longitude: storeLng } = useLocationStore();
  const { authUserId, anonymousId } = useAuthStore();

  const displayAddress = propAddress || storeAddress;
  const finalLat = propLat || storeLat;
  const finalLng = propLng || storeLng;
  const isEventShare = Boolean(eventId);

  const [placeName, setPlaceName] = useState(defaultPlaceName || "");
  const [category, setCategory] = useState(eventId ? "행사" : "기타");
  const [selectedStatus, setSelectedStatus] = useState("보통");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedRecord, setCompletedRecord] = useState<{
    title: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startScrollLeft, setStartScrollLeft] = useState(0);

  const onDragStart = (event: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(event.pageX - scrollRef.current.offsetLeft);
    setStartScrollLeft(scrollRef.current.scrollLeft);
  };

  const onDragEnd = () => setIsDragging(false);

  const onDragMove = (event: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;

    event.preventDefault();
    const currentX = event.pageX - scrollRef.current.offsetLeft;
    const distance = (currentX - startX) * 1.6;
    scrollRef.current.scrollLeft = startScrollLeft - distance;
  };

  const handleSubmit = async () => {
    if (!placeName.trim()) {
      alert("장소 이름을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    const isRequest = mode === "request";
    const statusOption = SHAREABLE_STATUS_OPTIONS.find((option) => option.label === selectedStatus);
    const nextStatus = isRequest ? "요청" : statusOption?.label || "보통";
    const nextStatusColor = isRequest ? "text-orange-500" : statusOption?.badgeText || "text-blue-500";

    try {
      const created = await postLiveStatus({
        event_id: eventId ? String(eventId) : undefined,
        place_name: placeName.trim(),
        category,
        status: nextStatus,
        status_color: nextStatusColor,
        is_request: isRequest,
        verified_count: 1,
        latitude: finalLat,
        longitude: finalLng,
        message: note.trim(),
        user_id: authUserId,
        anonymous_id: authUserId ? null : anonymousId,
      });

      saveAlbumMemory({
        sourceId: created.id,
        type: "status",
        title: placeName.trim(),
        subtitle: category,
        description:
          note.trim() ||
          (isRequest
            ? "이 장소의 현재 상황을 다른 이웃에게 요청했어요."
            : `${nextStatus} 상태를 현장에서 바로 기록했어요.`),
        locationLabel: displayAddress || placeName.trim(),
        address: displayAddress,
        latitude: finalLat,
        longitude: finalLng,
        statusLabel: nextStatus,
        category,
        createdAt: created.created_at,
      });

      setCompletedRecord({
        title: placeName.trim(),
        address: displayAddress,
        latitude: finalLat,
        longitude: finalLng,
      });
    } catch (error) {
      console.error("상황 공유 등록 실패:", error);
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const mapHref = completedRecord?.latitude && completedRecord?.longitude
    ? `/map?lat=${completedRecord.latitude}&lng=${completedRecord.longitude}&title=${encodeURIComponent(completedRecord.title)}&address=${encodeURIComponent(completedRecord.address || "")}`
    : "/map";

  if (completedRecord) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 text-secondary">
          <MapPin size={30} />
        </div>
        <h3 className="mt-5 text-[20px] font-black text-foreground">기록이 지도와 내발문자에 남았어요</h3>
        <p className="mt-2 max-w-[280px] text-[13px] font-medium leading-relaxed text-foreground/55">
          지금 남긴 상태는 위치와 함께 저장됐습니다. 바로 지도에서 확인하거나 내발문자에서 다시 꺼내볼 수 있어요.
        </p>
        <div className="mt-6 grid w-full grid-cols-2 gap-3">
          <Link
            href={mapHref}
            className="inline-flex items-center justify-center rounded-2xl bg-secondary px-4 py-3 text-[13px] font-black text-white shadow-lg shadow-secondary/20"
            onClick={onSuccess}
          >
            지도에서 보기
          </Link>
          <Link
            href="/album"
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-card-bg px-4 py-3 text-[13px] font-black text-foreground/70"
            onClick={onSuccess}
          >
            내발문자에서 보기
          </Link>
        </div>
        <button
          type="button"
          onClick={onSuccess}
          className="mt-3 w-full rounded-2xl bg-foreground/5 px-4 py-3 text-[13px] font-black text-foreground/45"
        >
          닫기
        </button>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <div className={compact ? "-mx-2" : "-mx-4"}>
        <IdentityHeader compact={compact} />
      </div>

      {isEventShare && (
        <div className="rounded-2xl border border-secondary/15 bg-secondary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-secondary p-2 text-white">
              <PartyPopper size={18} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-secondary">
                행사 현장 공유
              </p>
              <h4 className="mt-1 text-[15px] font-black text-foreground">
                이 행사 핀에 지금 상태를 연결합니다
              </h4>
              <p className="mt-1 text-[12px] font-medium leading-relaxed text-foreground/50">
                행사 기간에만 현장 상태를 남길 수 있고, 공유한 내용은 지도와 내발문자에 이어집니다.
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-foreground/70">
          <span>{isEventShare ? "행사 이름" : "장소 이름"}</span>
          {displayAddress && (
            <button 
              type="button"
              onClick={() => setPlaceName(displayAddress)}
              className="flex items-center rounded bg-secondary/10 px-1.5 py-0.5 text-[10px] text-secondary hover:bg-secondary/20 transition-colors cursor-pointer"
            >
              <MapPin size={8} className="mr-0.5" />
              현재 위치 기준
            </button>
          )}
        </label>
        <input
          type="text"
          placeholder={isEventShare ? "예: 수원화성문화제" : "예: 행궁동 공방거리"}
          value={placeName}
          onChange={(event) => setPlaceName(event.target.value)}
          className={`w-full rounded-xl border border-border bg-card-bg text-foreground text-sm outline-none transition-colors ${
            compact ? "p-3" : "p-3.5"
          } ${
            mode === "request"
              ? "focus:border-[#5D4037] focus:ring-2 focus:ring-[#5D4037]/20"
              : "focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          }`}
        />
        {displayAddress && (
          <p className="ml-1 mt-1.5 text-[10px] text-foreground/40">
            현재 주소: <span className="underline decoration-border">{displayAddress}</span>
          </p>
        )}
      </div>

      <div>
        <label className={`block text-xs font-bold text-foreground/70 ${compact ? "mb-2" : "mb-2.5"}`}>
          장소 카테고리
        </label>
        <div
          ref={scrollRef}
          onMouseDown={onDragStart}
          onMouseLeave={onDragEnd}
          onMouseUp={onDragEnd}
          onMouseMove={onDragMove}
          className={`-mx-4 flex select-none space-x-2 overflow-x-auto px-4 active:cursor-grabbing [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-[3px] ${
            compact ? "pb-2" : "pb-4"
          }`}
        >
          {CATEGORIES.map((item) => {
            const Icon = item.icon;
            const isSelected = category === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={`flex flex-shrink-0 items-center space-x-1.5 rounded-full border border-border text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  compact ? "px-3.5 py-2" : "px-4 py-2.5"
                } ${
                  isSelected
                    ? mode === "request"
                      ? "scale-105 border-[#5D4037] bg-[#5D4037] text-white shadow-md"
                      : "scale-105 border-secondary bg-secondary text-white shadow-md"
                    : "bg-card-bg text-foreground/60 hover:bg-foreground/5"
                }`}
              >
                <Icon size={14} className={isSelected ? "text-white" : "text-foreground/40"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {mode === "share" && (
        <div>
          <label className={`block text-xs font-bold text-foreground/70 ${compact ? "mb-2" : "mb-2.5"}`}>
            현재 현장 상태
          </label>
          <div className="flex space-x-2">
            {SHAREABLE_STATUS_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setSelectedStatus(option.label)}
                className={`flex-1 rounded-xl border text-sm font-bold transition-all ${
                  compact ? "py-2.5" : "py-3"
                } ${
                  selectedStatus === option.label
                    ? `${option.tone} ${option.hover} ${option.border} ring-2 ring-offset-1 dark:ring-offset-background ${option.ring}`
                    : "border-border bg-card-bg text-foreground/50 hover:bg-foreground/5"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-bold text-foreground/70">
          {mode === "request" ? "추가 요청 메모" : "상세 메모"}
        </label>
        <textarea
          className={`w-full resize-none rounded-xl border border-border bg-card-bg text-foreground text-sm outline-none transition-colors ${
            compact ? "min-h-[84px] p-3.5" : "min-h-[100px] p-4"
          } ${
            mode === "request"
              ? "focus:border-[#5D4037] focus:ring-2 focus:ring-[#5D4037]/20"
              : "focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          }`}
          placeholder={
            mode === "request"
              ? "궁금한 점이나 확인이 필요한 내용을 남겨보세요."
              : isEventShare
                ? "예: 줄 길어요, 사람 많음, 입장은 빠른 편이에요."
                : "현장 분위기나 대기 상황처럼 함께 남기고 싶은 내용을 적어보세요."
          }
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleSubmit}
        className={`w-full rounded-2xl text-sm font-black text-white shadow-lg transition-all disabled:opacity-50 ${
          mode === "request"
            ? "bg-[#5D4037] shadow-[#5D4037]/20"
            : "bg-secondary shadow-secondary/20"
        } ${compact ? "py-3.5" : "py-4"}`}
      >
        {isSubmitting
          ? "등록 중..."
          : mode === "request"
            ? "요청 남기기"
            : isEventShare
              ? "행사 현장 상태 공유하기"
              : "상황 공유하기"}
      </button>
    </div>
  );
}
