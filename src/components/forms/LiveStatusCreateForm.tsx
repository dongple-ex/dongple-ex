"use client";

import { useRef, useState } from "react";
import {
  Building2,
  Coffee,
  Dumbbell,
  HeartPulse,
  Home,
  MapPin,
  ParkingCircle,
  ShoppingBag,
  Store,
  Trees,
} from "lucide-react";
import IdentityHeader from "@/features/auth/components/IdentityHeader";
import { saveAlbumMemory } from "@/lib/albumMemory";
import { useLocationStore } from "@/lib/store/locationStore";
import { SHAREABLE_STATUS_OPTIONS } from "@/lib/statusTheme";
import { postLiveStatus } from "@/services/statusService";

const CATEGORIES = [
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
  currentAddress?: string;
  latitude?: number;
  longitude?: number;
  onSuccess?: () => void;
  compact?: boolean;
}

export default function LiveStatusCreateForm({
  mode = "share",
  currentAddress: propAddress,
  latitude: propLat,
  longitude: propLng,
  onSuccess,
  compact = false,
}: LiveStatusCreateFormProps) {
  const { address: storeAddress, latitude: storeLat, longitude: storeLng } = useLocationStore();

  const displayAddress = propAddress || storeAddress;
  const finalLat = propLat || storeLat;
  const finalLng = propLng || storeLng;

  const [placeName, setPlaceName] = useState("");
  const [category, setCategory] = useState("기타");
  const [selectedStatus, setSelectedStatus] = useState("보통");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        place_name: placeName.trim(),
        category,
        status: nextStatus,
        status_color: nextStatusColor,
        is_request: isRequest,
        verified_count: 1,
        latitude: finalLat,
        longitude: finalLng,
        message: note.trim(),
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
        statusLabel: nextStatus,
        category,
        createdAt: created.created_at,
      });

      onSuccess?.();
    } catch (error) {
      console.error("상황 공유 등록 실패:", error);
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <div className={compact ? "-mx-2" : "-mx-4"}>
        <IdentityHeader compact={compact} />
      </div>

      <div>
        <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-gray-700">
          <span>장소 이름</span>
          {displayAddress && (
            <span className="flex items-center rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-[#2E7D32]">
              <MapPin size={8} className="mr-0.5" />
              현재 위치 기준
            </span>
          )}
        </label>
        <input
          type="text"
          placeholder="예: 행궁동 공방거리"
          value={placeName}
          onChange={(event) => setPlaceName(event.target.value)}
          className={`w-full rounded-xl border border-gray-200 text-sm outline-none transition-colors ${
            compact ? "p-3" : "p-3.5"
          } ${
            mode === "request"
              ? "focus:border-[#5D4037] focus:ring-2 focus:ring-[#5D4037]/20"
              : "focus:border-[#2E7D32] focus:ring-2 focus:ring-[#2E7D32]/20"
          }`}
        />
        {displayAddress && (
          <p className="ml-1 mt-1.5 text-[10px] text-gray-400">
            현재 주소: <span className="underline decoration-gray-200">{displayAddress}</span>
          </p>
        )}
      </div>

      <div>
        <label className={`block text-xs font-bold text-gray-700 ${compact ? "mb-2" : "mb-2.5"}`}>
          장소 카테고리
        </label>
        <div
          ref={scrollRef}
          onMouseDown={onDragStart}
          onMouseLeave={onDragEnd}
          onMouseUp={onDragEnd}
          onMouseMove={onDragMove}
          className={`-mx-4 flex select-none space-x-2 overflow-x-auto px-4 active:cursor-grabbing [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-[3px] ${
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
                className={`flex flex-shrink-0 items-center space-x-1.5 rounded-full border border-gray-200 text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  compact ? "px-3.5 py-2" : "px-4 py-2.5"
                } ${
                  isSelected
                    ? mode === "request"
                      ? "scale-105 border-[#5D4037] bg-[#5D4037] text-white shadow-md"
                      : "scale-105 border-[#2E7D32] bg-[#2E7D32] text-white shadow-md"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon size={14} className={isSelected ? "text-white" : "text-gray-400"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {mode === "share" && (
        <div>
          <label className={`block text-xs font-bold text-gray-700 ${compact ? "mb-2" : "mb-2.5"}`}>
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
                    ? `${option.tone} ${option.hover} ${option.border} ring-2 ring-offset-1 ${option.ring}`
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-bold text-gray-700">
          {mode === "request" ? "추가 요청 메모" : "상세 메모"}
        </label>
        <textarea
          className={`w-full resize-none rounded-xl border border-gray-200 text-sm outline-none transition-colors ${
            compact ? "min-h-[84px] p-3.5" : "min-h-[100px] p-4"
          } ${
            mode === "request"
              ? "focus:border-[#5D4037] focus:ring-2 focus:ring-[#5D4037]/20"
              : "focus:border-[#2E7D32] focus:ring-2 focus:ring-[#2E7D32]/20"
          }`}
          placeholder={
            mode === "request"
              ? "궁금한 점이나 확인이 필요한 내용을 남겨보세요."
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
            : "bg-[#2E7D32] shadow-[#2E7D32]/20"
        } ${compact ? "py-3.5" : "py-4"}`}
      >
        {isSubmitting ? "등록 중..." : mode === "request" ? "요청 남기기" : "상황 공유하기"}
      </button>
    </div>
  );
}
