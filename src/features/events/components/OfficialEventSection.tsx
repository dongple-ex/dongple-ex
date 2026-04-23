"use client";

import { useEffect, useState } from "react";
import { ArrowRight, PartyPopper } from "lucide-react";
import Link from "next/link";

import { useUIStore } from "@/lib/store/uiStore";
import { fetchOfficialEvents, OfficialEvent } from "@/services/eventService";
import { fetchLiveStatus, getEventStatusSummary, LiveStatus } from "@/services/statusService";

import EventSummaryCard from "./EventSummaryCard";

export default function OfficialEventSection() {
    const [events, setEvents] = useState<OfficialEvent[]>([]);
    const [statuses, setStatuses] = useState<LiveStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const openBottomSheet = useUIStore((state) => state.openBottomSheet);

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const data = await fetchOfficialEvents();
                setEvents(data.slice(0, 5));

                const liveData = await fetchLiveStatus();
                setStatuses(liveData);
            } catch (error) {
                console.error("Failed to load official events:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadEvents();
    }, []);

    const handleEventClick = (event: OfficialEvent) => {
        const period = `${event.event_start_date} ~ ${event.event_end_date}`;
        const summary = getEventStatusSummary(event, statuses);
        const statusBlock = summary
            ? `[지금 상태]\n${summary.label} (${summary.updatedAgo})\n${summary.latestMessage || "최근 현장 공유가 들어왔습니다."}`
            : "[지금 상태]\n아직 공유된 현장 상태가 없습니다.\n지도에서 바로 현장 상황을 남겨보세요.";

        openBottomSheet("postDetail", {
            id: event.id,
            eventId: event.id,
            defaultPlaceName: event.title,
            address: event.address,
            latitude: event.lat,
            longitude: event.lng,
            title: event.title,
            content: `${event.address}\n\n[행사 일정]\n${period}\n\n${statusBlock}\n\n${event.description || "행사 기본 정보는 들어와 있지만, 현장감은 아직 비어 있습니다. 첫 공유를 남겨보세요."}`,
            is_official: true,
            meta: event.meta,
            source: event.source
        });
    };

    if (isLoading || events.length === 0) {
        return null;
    }

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between px-4">
                <div className="flex items-center space-x-2">
                    <PartyPopper size={20} className="text-secondary" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary">지금 핫한 곳</p>
                        <h2 className="text-lg font-black text-[#3E2723]">오늘 행사 현재 상태</h2>
                    </div>
                </div>
                <Link
                    href="/events"
                    className="flex items-center text-[12px] font-black text-secondary hover:underline"
                >
                    전체보기 <ArrowRight size={14} className="ml-1" />
                </Link>
            </div>

            <div className="no-scrollbar flex space-x-4 overflow-x-auto px-4 pb-4">
                {events.map((event) => (
                    <EventSummaryCard
                        key={event.id}
                        event={event}
                        statusSummary={getEventStatusSummary(event, statuses)}
                        onClick={() => handleEventClick(event)}
                    />
                ))}
            </div>
        </section>
    );
}
