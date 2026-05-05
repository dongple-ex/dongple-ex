"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronLeft, MapPin } from "lucide-react";
import IdentityHeader from "@/features/auth/components/IdentityHeader";

const CATEGORIES = ["동네질문", "맛집", "일상", "부동산", "병원/의료", "카페/공부"];

export default function WritePage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <button onClick={() => router.back()} className="-ml-2 p-2" aria-label="뒤로">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-black">글쓰기</h1>
        <button disabled={!content.trim()} className={`font-black ${content.trim() ? "text-secondary" : "text-foreground/25"}`}>
          완료
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="pt-4">
          <IdentityHeader />
        </div>

        <div className="space-y-4 p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold ${
                  category === cat ? "border-secondary bg-secondary text-white" : "border-border bg-card-bg text-foreground/65"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="지금 동네에서 나누고 싶은 이야기를 적어보세요."
            className="h-64 w-full resize-none bg-transparent text-base outline-none placeholder:text-foreground/28"
          />

          <div className="flex items-center gap-4 border-t border-border pt-4">
            <button className="flex items-center gap-2 text-foreground/55">
              <Camera size={20} />
              <span className="text-sm font-bold">사진 (0/10)</span>
            </button>
            <button className="flex items-center gap-2 text-foreground/55">
              <MapPin size={20} />
              <span className="text-sm font-bold">장소</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
