"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, MapPin } from "lucide-react";
import IdentityHeader from "@/features/auth/components/IdentityHeader";

export default function WritePage() {
    const router = useRouter();
    const [content, setContent] = useState("");

    const handleBack = () => router.back();

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b">
                <button onClick={handleBack} className="p-2 -ml-2">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-bold text-[#3E2723]">글쓰기</h1>
                <button
                    disabled={!content}
                    className={`font-bold ${content ? "text-[#795548]" : "text-gray-300"}`}
                >
                    완료
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="pt-4">
                    <IdentityHeader />
                </div>
                
                <div className="p-4 space-y-4">
                <div className="flex space-x-2 overflow-x-auto pb-2">
                    {["동네질문", "동네맛집", "일상", "부동산", "병원/의료", "카페/학습"].map((cat) => (
                        <button
                            key={cat}
                            className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium whitespace-nowrap hover:bg-gray-50 text-[#3E2723]"
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="역삼동 이웃과 나누고 싶은 이야기를 적어보세요."
                    className="w-full h-64 resize-none outline-none text-base placeholder:text-gray-300 text-[#3E2723]"
                />

                <div className="flex items-center space-x-4 border-t pt-4">
                    <button className="flex items-center space-x-2 text-gray-500">
                        <Camera size={20} />
                        <span className="text-sm">사진 (0/10)</span>
                    </button>
                    <button className="flex items-center space-x-2 text-gray-500">
                        <MapPin size={20} />
                        <span className="text-sm">장소</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
