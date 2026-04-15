"use client";

import { 
    ArrowLeft, MapPin, SlidersHorizontal, HelpCircle, Plus, X, Search,
    Home, Trees, Dumbbell, Coffee, ShoppingBag, Store, ParkingCircle, HeartPulse, Building2 
} from "lucide-react";
import { useState, useRef, useEffect, Suspense } from "react";
import { fetchLiveStatus, LiveStatus, subscribeLiveUpdates } from "@/services/statusService";
import { getAddressFromCoords, getCoordsFromAddress, searchPlaces } from "@/services/api";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useUIStore } from "@/lib/store/uiStore";
import { useLocationStore } from "@/lib/store/locationStore";
import { motion, AnimatePresence } from "framer-motion";

declare global {
  interface Window {
    naver: any;
  }
}

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

function MapContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const openGlobalBottomSheet = useUIStore((state) => state.openBottomSheet);
    const { 
        latitude: storeLat, 
        longitude: storeLng, 
        address: storeAddress,
        setLocation 
    } = useLocationStore();

    const [markers, setMarkers] = useState<LiveStatus[]>([]);
    const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isResultOpen, setIsResultOpen] = useState(false);
    const [isMapLoading, setIsMapLoading] = useState(true);
    const [isMapMoving, setIsMapMoving] = useState(false);
    const [isNearbyStatus, setIsNearbyStatus] = useState(false);
    const [sheetHeight, setSheetHeight] = useState(24);
    const [isDragging, setIsDragging] = useState(false);

    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const tempMarkerRef = useRef<any>(null);
    const startY = useRef(0);
    const startHeight = useRef(24);

    const loadData = async () => {
        try {
            const data = await fetchLiveStatus();
            setMarkers(data);
        } catch (error) {
            console.error("Data load failed:", error);
        }
    };

    useEffect(() => {
        loadData();
        const sub = subscribeLiveUpdates(loadData);
        return () => { sub.unsubscribe(); };
    }, []);

    useEffect(() => {
        if (mapRef.current) {
            renderMarkers();
        }
    }, [markers, expandedCardId, sheetHeight]);

    const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371e3;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const checkNearbyStatus = (centerLat: number, centerLng: number) => {
        const threshold = 50;
        const exists = markers.some(m => {
            if (!m.latitude || !m.longitude) return false;
            return getDistance(centerLat, centerLng, m.latitude, m.longitude) < threshold;
        });
        setIsNearbyStatus(exists);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(true);
        startY.current = e.clientY;
        startHeight.current = sheetHeight;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const deltaVH = ((e.clientY - startY.current) / window.innerHeight) * 100;
        let newHeight = Math.max(24, Math.min(92, startHeight.current - deltaVH));
        setSheetHeight(newHeight);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
        // 하단 네비게이션 바(약 120px)를 고려하여 최소 높이를 24vh로 조정
        if (sheetHeight > 70) setSheetHeight(92);
        else if (sheetHeight > 35) setSheetHeight(50);
        else setSheetHeight(24);
    };

    const handleSearch = async (initialQuery?: string) => {
        const queryToSearch = initialQuery || searchQuery;
        if (!queryToSearch?.trim()) return;
        setIsResultOpen(false);
        try {
            const poiResults = await searchPlaces(queryToSearch);
            setSearchResults(poiResults);
            if (poiResults?.length > 0) {
                setIsResultOpen(true);
                if (initialQuery) handleSelectPlace(poiResults[0]);
            } else {
                const coords = await getCoordsFromAddress(queryToSearch);
                if (coords && mapRef.current) {
                    mapRef.current.setCenter(new window.naver.maps.LatLng(coords.lat, coords.lng));
                }
            }
        } catch (err) {
            console.error("Search error:", err);
        }
    };

    const handleSelectPlace = async (place: any) => {
        setIsResultOpen(false);
        if (window.naver?.maps?.TransCoord) {
            const tm128 = new window.naver.maps.Point(parseInt(place.mapx), parseInt(place.mapy));
            const latlng = window.naver.maps.TransCoord.fromTM128ToLatLng(tm128);
            if (mapRef.current) {
                mapRef.current.setCenter(latlng);
                mapRef.current.setZoom(17);
                if (tempMarkerRef.current) tempMarkerRef.current.setMap(null);
                tempMarkerRef.current = new window.naver.maps.Marker({
                    position: latlng,
                    map: mapRef.current,
                    icon: {
                        content: `<div class="w-4 h-4 bg-secondary rounded-full border-2 border-white shadow-lg animate-bounce"></div>`,
                        anchor: new window.naver.maps.Point(8, 8),
                    }
                });
            }
        }
    };

    const initMap = () => {
        if (!window.naver?.maps || mapRef.current) return;
        const container = document.getElementById('map-container');
        if (!container) return;

        const map = new window.naver.maps.Map(container, {
            center: new window.naver.maps.LatLng(storeLat, storeLng),
            zoom: 15,
            logoControl: false,
            mapDataControl: false,
            scaleControl: false,
            mapTypeControl: false,
        });
        mapRef.current = map;

        window.naver.maps.Event.addListener(map, 'idle', async () => {
            setIsMapLoading(false);
            setIsMapMoving(false);
            const center = map.getCenter();
            const addrResult = await getAddressFromCoords(center.y, center.x);
            setLocation(center.y, center.x, addrResult.fullAddress, addrResult.regionName);
            checkNearbyStatus(center.y, center.x);
        });

        window.naver.maps.Event.addListener(map, 'dragstart', () => {
            setIsMapMoving(true);
            setSheetHeight(15);
            setIsResultOpen(false);
        });

        renderMarkers();
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.naver?.maps && !mapRef.current) {
            initMap();
        }
    }, []);

    const handleOpenCreate = async (mode: string) => {
        if (!mapRef.current) return;
        const center = mapRef.current.getCenter();
        const addrResult = await getAddressFromCoords(center.y, center.x);
        openGlobalBottomSheet("liveCreate", {
            mode,
            address: addrResult.fullAddress,
            latitude: center.y,
            longitude: center.x
        });
    };

    const renderMarkers = () => {
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];
        if (!window.naver?.maps || !mapRef.current) return;

        markers.forEach(m => {
            const isSelected = expandedCardId === m.id;
            const markerContent = `
                <div class="flex flex-col items-center transform -translate-x-1/2 -translate-y-full cursor-pointer transition-all duration-300 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-10'}">
                    <div class="px-3 py-1.5 ring-1 ring-black/5 shadow-2xl rounded-2xl text-white text-[12px] font-black flex items-center bg-white/90 backdrop-blur-xl border border-white/40">
                        <div class="w-2.5 h-2.5 rounded-full mr-2 ${m.status === '여유' ? 'bg-green-500' : m.status === '보통' ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse shadow-sm"></div>
                        <span class="text-foreground">${m.status}</span>
                    </div>
                    <div class="w-2 h-2 bg-white/90 rotate-45 -translate-y-1 shadow-sm border-r border-b border-black/5"></div>
                </div>
            `;
            const marker = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(m.latitude || 37.3015, m.longitude || 126.9930),
                map: mapRef.current,
                icon: { content: markerContent, anchor: new window.naver.maps.Point(0, 0) }
            });
            window.naver.maps.Event.addListener(marker, 'click', () => {
                setExpandedCardId(expandedCardId === m.id ? null : m.id);
                if (expandedCardId !== m.id) {
                    setSheetHeight(50);
                    mapRef.current.panTo(marker.getPosition());
                }
            });
            markersRef.current.push(marker);
        });
    };

    return (
        <div className="relative w-full h-[100dvh] bg-background overflow-hidden flex flex-col max-w-md mx-auto shadow-2xl">
            <Script 
                src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}&submodules=geocoder&submodules=transcoord`}
                onLoad={initMap}
                strategy="afterInteractive"
            />
            
            <div className="absolute top-6 left-5 right-5 z-50 pointer-events-none">
                <div className="flex flex-col space-y-3">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center space-x-3 pointer-events-auto">
                        <button onClick={() => router.back()} className="p-3 bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl text-foreground/60 hover:text-accent active:scale-95 transition-all">
                            <ArrowLeft size={24} />
                        </button>
                        <div className="flex-1 relative group">
                            <input 
                                type="text" placeholder="어디로 갈까요? 장소나 주소 검색..." value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsResultOpen(true)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full h-14 pl-12 pr-12 bg-white/80 backdrop-blur-xl border border-white/40 rounded-[24px] text-[15px] font-black text-foreground shadow-2xl transition-all outline-none placeholder:text-foreground/30"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={20} />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-foreground/5 rounded-full text-foreground/40"><X size={14} /></button>
                            )}
                        </div>
                    </motion.div>
                </div>
                <AnimatePresence>
                    {isResultOpen && searchResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-2xl mt-4 p-2 max-h-[400px] overflow-y-auto pointer-events-auto border border-white/50">
                            {searchResults.map((place, idx) => (
                                <div key={idx} onClick={() => handleSelectPlace(place)} className="p-4 hover:bg-foreground/5 rounded-2xl cursor-pointer">
                                    <h5 className="font-black text-[15px] text-foreground mb-1" dangerouslySetInnerHTML={{ __html: place.title }} />
                                    <p className="text-[12px] text-foreground/40 font-bold">{place.roadAddress || place.address}</p>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="relative flex-1 w-full" style={{ minHeight: 'calc(100dvh - 15vh)' }}>
                <div id="map-container" className="absolute inset-0 w-full h-full bg-gray-100" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ paddingBottom: `${sheetHeight}vh` }}>
                    <motion.div animate={{ y: isMapMoving ? -40 : 0, scale: isMapMoving ? 1.15 : 1 }} className="relative flex flex-col items-center mb-10">
                        {storeAddress && !isMapLoading && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute -top-16 bg-white/90 backdrop-blur-2xl px-5 py-3 rounded-[24px] shadow-2xl whitespace-nowrap flex items-center space-x-4 border border-white/60 pointer-events-auto">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-foreground/40 tracking-tighter uppercase">현재 위치</span>
                                    <span className="text-[13px] font-black text-foreground max-w-[150px] truncate">{storeAddress}</span>
                                </div>
                                <button onClick={() => handleOpenCreate("share")} className="bg-secondary text-white text-[12px] px-5 py-2 rounded-xl font-black shadow-lg">제보하기</button>
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/90 rotate-45 border-r border-b border-white/60" />
                            </motion.div>
                        )}
                        <MapPin size={54} className="text-secondary drop-shadow-[0_20px_20px_rgba(0,0,0,0.2)]" />
                        <motion.div animate={{ scale: isMapMoving ? 1.8 : 0.8, opacity: isMapMoving ? 0.3 : 0.1 }} className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-black rounded-[100%] blur-[4px]" />
                    </motion.div>
                </div>
            </div>

            <div className={`absolute bottom-0 left-0 w-full z-[60] bg-white/80 backdrop-blur-3xl rounded-t-[44px] shadow-2xl border-t border-white/50 pointer-events-auto flex flex-col transition-all duration-700`} style={{ height: `${sheetHeight}vh` }}>
                <div className="w-full pt-5 pb-3 cursor-ns-resize flex flex-col items-center shrink-0 touch-none" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
                    <div className="w-12 h-1.5 bg-foreground/10 rounded-full mb-4" />
                    <div className="w-full px-8 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black text-secondary tracking-widest uppercase mb-1">DONGPLE LIVE</span>
                            <h3 className="font-black text-foreground text-2xl tracking-tighter">주변의 순간들 <span className="text-secondary opacity-30 ml-1">{markers.length}</span></h3>
                        </div>
                        <div className="flex space-x-2">
                             <button onClick={() => handleOpenCreate("request")} className="p-3 bg-foreground/5 rounded-2xl text-foreground/40 hover:text-foreground transition-all"><HelpCircle size={22} /></button>
                             <button onClick={() => handleOpenCreate("share")} className="p-3 bg-secondary text-white rounded-2xl shadow-lg shadow-secondary/30 transition-all"><Plus size={22} /></button>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 overflow-y-auto space-y-4 flex-1 pb-32 no-scrollbar">
                    {markers.length > 0 ? markers.map(card => (
                        <motion.div key={card.id} id={`card-${card.id}`} onClick={() => {
                            setExpandedCardId(expandedCardId === card.id ? null : card.id);
                            if (expandedCardId !== card.id && mapRef.current) {
                                mapRef.current.panTo(new window.naver.maps.LatLng(card.latitude || 37.3015, card.longitude || 126.9930));
                                setSheetHeight(50);
                            }
                        }} className={`p-6 rounded-[32px] border border-foreground/5 bg-white/50 transition-all duration-500 ${expandedCardId === card.id ? 'ring-4 ring-secondary/5 bg-white border-secondary/20 shadow-2xl' : ''}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest block mb-2">{card.category}</span>
                                    <h4 className="font-black text-foreground text-[18px] leading-tight mb-2">{card.place_name}</h4>
                                    <div className={`text-[13px] font-black flex items-center ${card.status === '여유' ? 'text-green-600' : card.status === '보통' ? 'text-yellow-600' : 'text-red-600'}`}>
                                        <div className={`w-2 h-2 rounded-full mr-1.5 ${card.status === '여유' ? 'bg-green-500' : card.status === '보통' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                        {card.status} 상황
                                    </div>
                                </div>
                                <div className="w-14 h-14 bg-foreground/5 rounded-3xl flex items-center justify-center text-foreground/30"><MapPin size={24} /></div>
                            </div>
                            {expandedCardId === card.id && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 pt-6 border-t border-foreground/5 space-y-5">
                                    <div className="flex space-x-2">
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenCreate("request"); }} className="flex-1 py-3.5 bg-foreground/5 text-foreground/60 rounded-2xl font-black text-[13px]">정보 업데이트</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenCreate("share"); }} className="flex-1 py-3.5 bg-secondary text-white rounded-2xl font-black text-[13px] shadow-lg shadow-secondary/20">여기에 제보</button>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )) : (
                        <div className="py-20 flex flex-col items-center justify-center text-foreground/10 text-center">
                            <MapPin size={48} className="mb-4 opacity-5" />
                            <p className="font-black text-lg">주변에 등록된 소식이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function MapPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-white"><div className="w-12 h-12 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin"></div></div>}>
            <MapContent />
        </Suspense>
    );
}
