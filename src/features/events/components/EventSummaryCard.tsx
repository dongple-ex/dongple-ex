"use client";

import Image from "next/image";
import { BadgeCheck, Calendar, MapPin } from "lucide-react";

import { OfficialEvent } from "@/services/eventService";
import { EventStatusSummary } from "@/services/statusService";

interface EventSummaryCardProps {
    event: OfficialEvent;
    statusSummary?: EventStatusSummary | null;
    onClick: () => void;
}

export default function EventSummaryCard({ event, statusSummary, onClick }: EventSummaryCardProps) {
    return (
        <div
            onClick={onClick}
            className="w-[240px] flex-shrink-0 cursor-pointer rounded-3xl border border-border bg-card-bg p-4 shadow-sm transition-all hover:shadow-md active:scale-95"
        >
            <div className="relative mb-3 h-28 overflow-hidden rounded-2xl bg-foreground/5">
                {event.thumbnail_url ? (
                    <Image
                        src={event.thumbnail_url}
                        alt={event.title}
                        fill
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-foreground/5 text-foreground/20">
                        <MapPin size={24} />
                    </div>
                )}

                <div className="absolute left-2 top-2 flex items-center space-x-1.5 rounded-lg bg-card-bg/90 px-2 py-1 shadow-sm backdrop-blur-md">
                    <span className="text-[9px] font-black text-secondary">공식</span>
                    <BadgeCheck size={10} className="text-secondary" />
                </div>

                <div
                    className={`absolute bottom-2 left-2 rounded-full border px-2.5 py-1 text-[10px] font-black shadow-sm ${
                        statusSummary ? statusSummary.colorClass : "border-white/60 bg-black/45 text-white"
                    }`}
                >
                    {statusSummary ? `${statusSummary.label} · ${statusSummary.updatedAgo}` : "현장 상태 대기"}
                </div>
            </div>

            <h4 className="mb-3 text-[15px] font-black text-foreground line-clamp-1">
                {event.title}
            </h4>

            <div className="space-y-1.5">
                {statusSummary?.latestMessage && (
                    <div className="line-clamp-1 rounded-xl bg-foreground/5 px-3 py-2 text-[11px] font-bold text-foreground/50">
                        {statusSummary.latestMessage}
                    </div>
                )}

                <div className="flex items-center text-[11px] font-bold text-foreground/40">
                    <Calendar size={12} className="mr-1.5 shrink-0" />
                    <span className="truncate">{event.event_start_date}</span>
                </div>

                <div className="flex items-center text-[11px] font-bold text-foreground/40">
                    <MapPin size={12} className="mr-1.5 shrink-0" />
                    <span className="truncate">{event.address}</span>
                </div>
            </div>
        </div>
    );
}
