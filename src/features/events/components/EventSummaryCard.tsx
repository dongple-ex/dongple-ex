"use client";

import { OfficialEvent } from "@/services/eventService";
import { BadgeCheck, Calendar, MapPin } from "lucide-react";

interface EventSummaryCardProps {
    event: OfficialEvent;
    onClick: () => void;
}

export default function EventSummaryCard({ event, onClick }: EventSummaryCardProps) {
    return (
        <div 
            onClick={onClick}
            className="flex-shrink-0 w-[240px] bg-white rounded-3xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
        >
            <div className="relative h-28 bg-gray-50 rounded-2xl overflow-hidden mb-3">
                {event.thumbnail_url ? (
                    <img 
                        src={event.thumbnail_url} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200 bg-gray-100">
                        <MapPin size={24} />
                    </div>
                )}
                <div className="absolute top-2 left-2 flex items-center space-x-1.5 px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg shadow-sm">
                    <span className="text-[9px] font-black text-secondary">공식</span>
                    <BadgeCheck size={10} className="text-secondary" />
                </div>
            </div>
            
            <h4 className="font-black text-[15px] text-foreground mb-3 line-clamp-1">
                {event.title}
            </h4>
            
            <div className="space-y-1.5">
                <div className="flex items-center text-[11px] text-gray-400 font-bold">
                    <Calendar size={12} className="mr-1.5 shrink-0" />
                    <span className="truncate">{event.event_start_date}</span>
                </div>
                <div className="flex items-center text-[11px] text-gray-400 font-bold">
                    <MapPin size={12} className="mr-1.5 shrink-0" />
                    <span className="truncate">{event.address}</span>
                </div>
            </div>
        </div>
    );
}
