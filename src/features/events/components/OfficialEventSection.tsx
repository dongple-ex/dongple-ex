"use client";

import { useState, useEffect } from "react";
import { fetchOfficialEvents, OfficialEvent } from "@/services/eventService";
import { useUIStore } from "@/lib/store/uiStore";
import { ArrowRight, PartyPopper } from "lucide-react";
import Link from "next/link";
import EventSummaryCard from "./EventSummaryCard";

export default function OfficialEventSection() {
    const [events, setEvents] = useState<OfficialEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const openBottomSheet = useUIStore((state) => state.openBottomSheet);

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const data = await fetchOfficialEvents();
                setEvents(data.slice(0, 5)); // 상위 5개만 노출
            } catch (error) {
                console.error("Failed to load official events:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadEvents();
    }, []);

    const handleEventClick = (event: OfficialEvent) => {
        openBottomSheet("postDetail", {
            id: event.id,
            title: event.title,
            content: `${event.address}\n\n[축제 일정]\n${event.event_start_date} ~ ${event.event_end_date}\n\n${event.description || "상세 정보가 아직 등록되지 않았습니다."}`,
            is_official: true,
            meta: event.meta,
            source: event.source
        });
    };

    if (isLoading) return null;
    if (events.length === 0) return null;

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between px-4">
                <div className="flex items-center space-x-2">
                    <PartyPopper size={20} className="text-secondary" />
                    <h2 className="text-lg font-black text-[#3E2723]">우리 동네 공식 소식</h2>
                </div>
                <Link 
                    href="/events" 
                    className="flex items-center text-[12px] font-black text-secondary hover:underline"
                >
                    전체보기 <ArrowRight size={14} className="ml-1" />
                </Link>
            </div>

            <div className="flex overflow-x-auto pb-4 px-4 space-x-4 no-scrollbar">
                {events.map((event) => (
                    <EventSummaryCard 
                        key={event.id} 
                        event={event} 
                        onClick={() => handleEventClick(event)} 
                    />
                ))}
            </div>
        </section>
    );
}
