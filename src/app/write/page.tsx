"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronLeft, MapPin, X } from "lucide-react";
import Image from "next/image";
import IdentityHeader from "@/features/auth/components/IdentityHeader";
import { createPost } from "@/services/postService";
import { useAuthStore } from "@/lib/store/authStore";
import { useAdminSettingsStore } from "@/lib/store/adminSettingsStore";

const CATEGORIES = ["동네질문", "맛집", "일상", "부동산", "병원/의료", "카페/공부"];

export default function WritePage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const userId = useAuthStore(state => state.userId);
  const userRole = useAuthStore(state => state.userRole);
  const imageUploadSettings = useAdminSettingsStore(state => state.imageUpload);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = imageUploadSettings.maxWidth || 800;
          const MAX_HEIGHT = imageUploadSettings.maxHeight || 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL("image/jpeg", imageUploadSettings.quality || 0.7));
        };
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        setSelectedImage(compressedBase64);
      } catch (error) {
        console.error("Image compression failed:", error);
        alert("이미지 처리 중 오류가 발생했습니다.");
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createPost({
        content: content.trim(),
        category,
        post_type: "동네소식",
        user_id: userId,
        is_anonymous: userRole === "anonymous",
        image_url: selectedImage || undefined
      });
      router.push("/news");
      router.refresh();
    } catch (error) {
      console.error("Failed to create post:", error);
      alert("글 작성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <button onClick={() => router.back()} className="-ml-2 p-2" aria-label="뒤로" disabled={isSubmitting}>
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-black">글쓰기</h1>
        <button 
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting} 
          className={`font-black ${content.trim() && !isSubmitting ? "text-secondary" : "text-foreground/25"}`}
        >
          {isSubmitting ? "등록 중..." : "완료"}
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
            className="h-48 w-full resize-none bg-transparent text-base outline-none placeholder:text-foreground/28"
          />

          {selectedImage && (
            <div className="relative inline-block mt-2">
              <div className="relative h-24 w-24 rounded-lg overflow-hidden border border-border">
                <Image src={selectedImage} alt="Selected" fill className="object-cover" />
              </div>
              <button 
                onClick={removeImage}
                className="absolute -top-2 -right-2 rounded-full bg-foreground/80 p-1 text-background shadow-md"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-4 border-t border-border pt-4">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageChange}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-foreground/55"
            >
              <Camera size={20} />
              <span className="text-sm font-bold">사진 ({selectedImage ? 1 : 0}/1)</span>
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
