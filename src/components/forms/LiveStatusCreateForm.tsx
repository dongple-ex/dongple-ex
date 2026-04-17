"use client";

import { useState, useRef, useEffect } from "react";
import { 
    Home, Trees, Dumbbell, Coffee, ShoppingBag, Store, ParkingCircle, HeartPulse, Building2,
    MapPin, HelpCircle, Plus
} from "lucide-react";
import { postLiveStatus } from "@/services/statusService";

const CATEGORIES = [
    { id: "기타", label: "기타", icon: Home },
    { id: "공원", label: "공원", icon: Trees },
    { id: "운동", label: "운동", icon: Dumbbell },
    { id: "카페/식당", label: "카페/식당", icon: Coffee },
    { id: "마켓", label: "마켓", icon: ShoppingBag },
    { id: "편의점", label: "편의점", icon: Store },
    { id: "주차장", label: "주차장", icon: ParkingCircle },
    { id: "병원/약국", label: "병원/약국", icon: HeartPulse },
    { id: "기관", label: "기관", icon: Building2 },
];

const statusOptions = [
    { label: "여유", color: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200", badgeColor: "text-green-500" },
    { label: "보통", color: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200", badgeColor: "text-blue-500" },
    { label: "혼잡", color: "bg-red-100 text-red-700 hover:bg-red-200 border-red-200", badgeColor: "text-red-500" }
];

import { useLocationStore } from "@/lib/store/locationStore";

interface LiveStatusCreateFormProps {
    mode?: "request" | "share";
    currentAddress?: string;
    latitude?: number;
    longitude?: number;
    onSuccess?: () => void;
}

export default function LiveStatusCreateForm({ 
    mode = "share", 
    currentAddress: propAddress, 
    latitude: propLat, 
    longitude: propLng,
    onSuccess 
}: LiveStatusCreateFormProps) {
    const { address: storeAddress, latitude: storeLat, longitude: storeLng } = useLocationStore();
    
    // Props가 있으면 우선 사용, 없으면 Store 정보 사용
    const displayAddress = propAddress || storeAddress;
    const finalLat = propLat || storeLat;
    const finalLng = propLng || storeLng;

    const [newPlaceName, setNewPlaceName] = useState("");
    const [newCategory, setNewCategory] = useState("기타");
    const [selectedStatus, setSelectedStatus] = useState("보통");
    const [replyText, setReplyText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 카테고리 캐러셀 드래그 상태
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDrag, setIsDrag] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const onDragStart = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDrag(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const onDragEnd = () => setIsDrag(false);

    const onDragMove = (e: React.MouseEvent) => {
        if (!isDrag || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleSubmit = async () => {
        if (!newPlaceName.trim()) {
            alert("장소 이름을 입력해주세요.");
            return;
        }

        setIsSubmitting(true);
        const isRequest = mode === "request";
        
        let newStatus = "답변대기";
        let newBadgeColor = "text-[#5D4037]";
        
        if (!isRequest) {
            const statusOpt = statusOptions.find(opt => opt.label === selectedStatus);
            if (statusOpt) {
                newStatus = statusOpt.label;
                newBadgeColor = statusOpt.badgeColor;
            }
        }

        try {
            await postLiveStatus({
                place_name: newPlaceName,
                category: newCategory,
                status: newStatus,
                status_color: newBadgeColor,
                is_request: isRequest,
                verified_count: 1,
                latitude: finalLat,
                longitude: finalLng,
                message: replyText
            });
            
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("등록 실패:", error);
            alert("등록 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Address Badge */}
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                    <span>장소 이름 (필수)</span>
                    {displayAddress && (
                        <span className="text-[10px] text-[#2E7D32] bg-green-50 px-1.5 py-0.5 rounded flex items-center">
                            <MapPin size={8} className="mr-0.5" /> 현위치 주소 자동입력됨
                        </span>
                    )}
                </label>
                <input
                    type="text"
                    placeholder="어느 장소인가요?"
                    value={newPlaceName}
                    onChange={(e) => setNewPlaceName(e.target.value)}
                    className={`w-full text-sm p-3.5 border border-gray-200 rounded-xl focus:ring-2 outline-none transition-colors ${mode === 'request' ? 'focus:ring-[#5D4037]/20 focus:border-[#5D4037]' : 'focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]'}`}
                />
                {displayAddress && (
                    <p className="text-[10px] text-gray-400 mt-1.5 ml-1">
                        📍 <span className="underline decoration-gray-200">{displayAddress}</span> 부근
                    </p>
                )}
            </div>

            {/* Category Carousel */}
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-2.5">장소 카테고리</label>
                <div 
                    ref={scrollRef}
                    onMouseDown={onDragStart}
                    onMouseLeave={onDragEnd}
                    onMouseUp={onDragEnd}
                    onMouseMove={onDragMove}
                    className={`flex overflow-x-auto pb-4 -mx-4 px-4 [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent space-x-2 select-none active:cursor-grabbing cursor-grab`}
                >
                    {CATEGORIES.map((category) => {
                        const Icon = category.icon;
                        const isSelected = newCategory === category.id;
                        return (
                            <button
                                key={category.id}
                                onClick={() => setNewCategory(category.id)}
                                className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all duration-200 border-gray-200 flex-shrink-0 ${
                                    isSelected 
                                        ? (mode === 'request' 
                                            ? 'bg-[#5D4037] text-white border-[#5D4037] shadow-md scale-105' 
                                            : 'bg-[#2E7D32] text-white border-[#2E7D32] shadow-md scale-105')
                                        : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <Icon size={14} className={isSelected ? 'text-white' : 'text-gray-400'} />
                                <span>{category.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Status Options (Share mode only) */}
            {mode === "share" && (
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2.5">현재 현장 상태 (필수)</label>
                    <div className="flex space-x-2">
                        {statusOptions.map((option) => (
                            <button
                                key={option.label}
                                onClick={() => setSelectedStatus(option.label)}
                                className={`flex-1 py-3 text-sm font-bold rounded-xl border transition-all ${selectedStatus === option.label
                                    ? `${option.color} ring-2 ring-offset-1 ${option.label === '여유' ? 'ring-green-300' : option.label === '보통' ? 'ring-blue-300' : 'ring-red-300'}`
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* detailed Comments */}
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    {mode === 'request' ? '추가 질문 코멘트 (선택)' : '상세 공유 코멘트 (선택)'}
                </label>
                <textarea
                    className={`w-full text-sm p-4 border border-gray-200 rounded-xl focus:ring-2 outline-none min-h-[100px] resize-none transition-colors ${mode === 'request' ? 'focus:ring-[#5D4037]/20 focus:border-[#5D4037]' : 'focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]'}`}
                    placeholder={mode === 'request' ? '궁금한 내용을 자유롭게 적어보세요.' : '이웃들에게 도움이 될 만한 상세 상황을 적어보세요.'}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full mt-2 py-4 text-white text-sm font-bold rounded-xl transition-colors shadow-md flex justify-center items-center disabled:opacity-50 ${mode === 'request' ? 'bg-[#5D4037] hover:bg-[#4E342E]' : 'bg-[#2E7D32] hover:bg-[#1B5E20]'}`}
            >
                {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                    mode === "request" ? "질문 등록" : "상황 공유"
                )}
            </button>
        </div>
    );
}
