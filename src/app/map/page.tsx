"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import { fetchLiveStatus, getEventStatusSummary, LiveStatus, subscribeLiveUpdates } from "@/services/statusService";
import { getAddressFromCoords, getCoordsFromAddress, searchPlaces, getNearestPlace } from "@/services/api";
import { fetchOfficialEvents } from "@/services/eventService";
import { createRoot } from "react-dom/client";
import PulseMarker from "@/components/map/PulseMarker";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store/uiStore";
import { useLocationStore } from "@/lib/store/locationStore";
import { 
    Home, Trees, Coffee, Store, PartyPopper
} from "lucide-react";

// New Components
import MapHeader from "@/features/map/components/MapHeader";
import MapOverlay from "@/features/map/components/MapOverlay";
import MapBottomSheet from "@/features/map/components/MapBottomSheet";
import { StatusMarker, ClickTargetMarker } from "@/features/map/components/Markers";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any;
  }
}

type MapPoint = { lat: number; lng: number };

type SearchResultItem = {
    title: string;
    mapx: string;
    mapy: string;
    roadAddress?: string;
    address?: string;
};

type OfficialEventMarker = Awaited<ReturnType<typeof fetchOfficialEvents>>[number];

type MarkerEntry = {
    marker: { setMap: (map: unknown) => void };
    root: ReturnType<typeof createRoot> | null;
};

const CATEGORIES = [
    { id: "전체", label: "전체", icon: Home },
    { id: "행사", label: "행사", icon: PartyPopper },
    { id: "카페", label: "카페", icon: Coffee },
    { id: "식당", label: "식당", icon: Store },
    { id: "공원", label: "공원", icon: Trees },
];

const createLatLng = (lat: number, lng: number) => new window.kakao.maps.LatLng(lat, lng);

const getLatLngPoint = (latlng: { getLat: () => number; getLng: () => number }) => ({
    lat: latlng.getLat(),
    lng: latlng.getLng(),
});

function MapContent() {
    const router = useRouter();
    const openGlobalBottomSheet = useUIStore((state) => state.openBottomSheet);
    const { 
        latitude: storeLat, 
        longitude: storeLng, 
        address: storeAddress,
        setLocation 
    } = useLocationStore();

    const [markers, setMarkers] = useState<LiveStatus[]>([]);
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [isResultOpen, setIsResultOpen] = useState(false);
    const [sheetHeight, setSheetHeight] = useState(24);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("전체");

    // Click-to-Pin states
    const [clickedLatLng, setClickedLatLng] = useState<MapPoint | null>(null);
    const [clickedAddress, setClickedAddress] = useState<string | null>(null);
    const [clickedPlaceName, setClickedPlaceName] = useState<string | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef = useRef<any>(null);
    const markersRef = useRef<MarkerEntry[]>([]);
    const clickMarkerRef = useRef<{ setMap: (map: unknown) => void } | null>(null);
    const [officialEvents, setOfficialEvents] = useState<OfficialEventMarker[]>([]);
    const officialEventsRef = useRef<OfficialEventMarker[]>([]);
    const isFetchingOfficial = useRef(false);

    useEffect(() => {
        officialEventsRef.current = officialEvents;
    }, [officialEvents]);
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

    const clearRenderedMarkers = useCallback(() => {
        markersRef.current.forEach(({ marker, root }) => {
            marker?.setMap?.(null);
            if (root) {
                setTimeout(() => {
                    try {
                        root.unmount();
                    } catch (e) {
                        console.error("Marker root unmount error:", e);
                    }
                }, 0);
            }
        });
        markersRef.current = [];
    }, []);

    useEffect(() => {
        return () => {
            clearRenderedMarkers();
            if (clickMarkerRef.current) {
                clickMarkerRef.current.setMap(null);
                clickMarkerRef.current = null;
            }
        };
    }, [clearRenderedMarkers]);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(true);
        startY.current = e.clientY;
        startHeight.current = sheetHeight;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const deltaVH = ((e.clientY - startY.current) / window.innerHeight) * 100;
        const newHeight = Math.max(15, Math.min(92, startHeight.current - deltaVH));
        setSheetHeight(newHeight);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (sheetHeight > 70) setSheetHeight(92);
        else if (sheetHeight > 35) setSheetHeight(50);
        else setSheetHeight(15);
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
                    mapRef.current.setCenter(createLatLng(coords.lat, coords.lng));
                    setClickedLatLng(coords);
                    const addr = await getAddressFromCoords(coords.lat, coords.lng);
                    setClickedAddress(addr.fullAddress);
                }
            }
        } catch (err) {
            console.error("Search error:", err);
        }
    };

    const handleSelectPlace = async (place: SearchResultItem) => {
        setIsResultOpen(false);
        if (window.kakao?.maps) {
            const lat = parseFloat(place.mapy);
            const lng = parseFloat(place.mapx);
            const latlng = createLatLng(lat, lng);
            if (mapRef.current) {
                mapRef.current.setCenter(latlng);
                mapRef.current.setLevel(3);
                setClickedLatLng({ lat, lng });
                setClickedAddress(place.roadAddress || place.address || place.title);
                setClickedPlaceName(place.title);
            }
        }
    };

    const initMap = useCallback(() => {
        if (!window.kakao?.maps || mapRef.current) return;
        const container = document.getElementById('map-container');
        if (!container) return;

        const map = new window.kakao.maps.Map(container, {
            center: createLatLng(storeLat, storeLng),
            level: 4,
        });
        mapRef.current = map;

        window.kakao.maps.event.addListener(map, 'idle', async () => {
            const center = map.getCenter();
            const { lat, lng } = getLatLngPoint(center);
            const addrResult = await getAddressFromCoords(lat, lng);
            setLocation(lat, lng, addrResult.fullAddress, addrResult.regionName);
        });

        window.kakao.maps.event.addListener(map, 'click', async (e: { latLng: { getLat: () => number; getLng: () => number } }) => {
            const { lat, lng } = getLatLngPoint(e.latLng);
            
            // Check for nearby official events
            let nearestEvent = null;
            let minDistance = Infinity;
            
            officialEventsRef.current.forEach(event => {
                // Simple Euclidean distance for proximity (approx. 0.0003 is ~30m)
                const dist = Math.sqrt(Math.pow(event.lat - lat, 2) + Math.pow(event.lng - lng, 2));
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestEvent = event;
                }
            });

            if (nearestEvent && minDistance < 0.0003) {
                setSelectedEventId(nearestEvent.id);
                setClickedLatLng(null);
                setSheetHeight(15);
                setExpandedCardId(null);
                setIsResultOpen(false);
                return;
            }

            setSelectedEventId(null);
            setClickedLatLng({ lat, lng });
            
            // 1. 역지오코딩 (주소)
            const addrResult = await getAddressFromCoords(lat, lng);
            setClickedAddress(addrResult.fullAddress);
            
            // 2. 주변 POI 탐색 (장소 아이콘 선택 기능)
            const nearest = await getNearestPlace(lat, lng);
            if (nearest) {
                setClickedPlaceName(nearest.title);
                // POI가 발견되면 해당 위치로 핀을 정밀하게 이동 (선택 가능하게 하는 효과)
                setClickedLatLng({ lat: parseFloat(nearest.mapy), lng: parseFloat(nearest.mapx) });
                if (nearest.roadAddress || nearest.address) {
                    setClickedAddress(nearest.roadAddress || nearest.address || addrResult.fullAddress);
                }
            } else {
                setClickedPlaceName(null);
            }

            setSheetHeight(15);
            setExpandedCardId(null);
            setIsResultOpen(false);
        });

        window.kakao.maps.event.addListener(map, 'dragstart', () => {
            setIsResultOpen(false);
        });

        const loadOfficial = async () => {
            if (isFetchingOfficial.current) return;
            isFetchingOfficial.current = true;
            const data = await fetchOfficialEvents();
            setOfficialEvents(data);
            isFetchingOfficial.current = false;
        };
        loadOfficial();
    }, [setLocation, storeLat, storeLng]);

    useEffect(() => {
        if (typeof window === 'undefined' || mapRef.current) return;

        if (window.kakao?.maps?.load) {
            window.kakao.maps.load(initMap);
            return;
        }

        const timer = window.setInterval(() => {
            if (window.kakao?.maps?.load) {
                window.clearInterval(timer);
                window.kakao.maps.load(initMap);
            }
        }, 100);

        return () => window.clearInterval(timer);
    }, [initMap]);

    const handleOpenCreateAt = useCallback((mode: string, lat: number, lng: number, address: string, placeName?: string) => {
        openGlobalBottomSheet("liveCreate", {
            mode,
            address,
            latitude: lat,
            longitude: lng,
            defaultPlaceName: placeName || (address ? address.split(' ').slice(-2).join(' ') : "우리 동네")
        });
    }, [openGlobalBottomSheet]);

    const renderMarkers = useCallback(() => {
        if (!window.kakao?.maps || !mapRef.current) return;

        clearRenderedMarkers();

        if (clickMarkerRef.current) {
            clickMarkerRef.current.setMap(null);
            clickMarkerRef.current = null;
        }

        // 1. Click-to-Pin Marker
        if (clickedLatLng) {
            const el = document.createElement('div');
            // Prevent event propagation to map
            el.addEventListener('click', (e) => e.stopPropagation());
            el.addEventListener('mousedown', (e) => e.stopPropagation());
            el.addEventListener('touchstart', (e) => e.stopPropagation());
            const root = createRoot(el);

            root.render(
                <ClickTargetMarker 
                    address={clickedAddress || ""} 
                    placeName={clickedPlaceName || undefined} 
                    onReport={() => handleOpenCreateAt("share", clickedLatLng.lat, clickedLatLng.lng, clickedAddress || "", clickedPlaceName || undefined)} 
                />
            );

            const marker = new window.kakao.maps.CustomOverlay({
                position: createLatLng(clickedLatLng.lat, clickedLatLng.lng),
                map: mapRef.current,
                content: el,
                xAnchor: 0.5,
                yAnchor: 1,
            });
            clickMarkerRef.current = marker;
            markersRef.current.push({ marker, root });
        }

        // 2. Live Status Markers (Shape: Balloon with status dot)
        markers
            .filter(m => {
                if (selectedCategory === "전체") return true;
                if (selectedCategory === "행사") return Boolean(m.event_id || m.tourapi_content_id);
                if (selectedCategory === "카페") return m.category === "카페" || m.category === "카페/식당";
                if (selectedCategory === "식당") return m.category === "식당" || m.category === "카페/식당";
                return m.category === selectedCategory;
            })
            .forEach(m => {
            const isSelected = expandedCardId === m.id;
            const el = document.createElement('div');
            // Prevent event propagation to map
            el.addEventListener('click', (e) => e.stopPropagation());
            el.addEventListener('mousedown', (e) => e.stopPropagation());
            el.addEventListener('touchstart', (e) => e.stopPropagation());
            const root = createRoot(el);

            root.render(
                <div
                    role="button"
                    tabIndex={0}
                    className="pointer-events-auto"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpandedCardId(m.id);
                        setSelectedEventId(null);
                        setSheetHeight(50);
                        setClickedLatLng(null);
                        mapRef.current.panTo(createLatLng(m.latitude || 37.3015, m.longitude || 126.9930));
                        setTimeout(() => {
                            const card = document.getElementById(`card-${m.id}`);
                            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.currentTarget.click();
                        }
                    }}
                >
                    <StatusMarker 
                        status={m.status} 
                        isRequest={m.is_request} 
                        isSelected={isSelected} 
                    />
                </div>
            );

            const marker = new window.kakao.maps.CustomOverlay({
                position: createLatLng(m.latitude || 37.3015, m.longitude || 126.9930),
                map: mapRef.current,
                content: el,
                xAnchor: 0.5,
                yAnchor: 1,
            });
            markersRef.current.push({ marker, root });
        });

        // 3. Official Event Markers (Shape: Circular Pulse)
        if (selectedCategory !== "카페" && selectedCategory !== "식당" && selectedCategory !== "공원") {
            officialEvents.forEach(festival => {
            const el = document.createElement('div');
            // Prevent event propagation to map
            el.addEventListener('click', (e) => e.stopPropagation());
            el.addEventListener('mousedown', (e) => e.stopPropagation());
            el.addEventListener('touchstart', (e) => e.stopPropagation());
            const root = createRoot(el);
            const statusSummary = getEventStatusSummary(festival, markers);
            const isSelected = selectedEventId === festival.id;

            root.render(
                <PulseMarker 
                    title={festival.title} 
                    category="행사"
                    statusLabel={statusSummary?.label}
                    updatedAgo={statusSummary?.updatedAgo}
                    statusIndicatorClass={statusSummary?.indicatorClass}
                    isSelected={isSelected}
                    onClick={() => {
                        setSelectedEventId(festival.id);
                        openGlobalBottomSheet("postDetail", {
                            title: festival.title,
                            content: `${festival.address}\n일시: ${festival.event_start_date} ~ ${festival.event_end_date}\n\n${statusSummary ? `[현장 상태]\n${statusSummary.label} (${statusSummary.updatedAgo})\n${statusSummary.latestMessage || "최근 현장 공유가 있습니다."}\n\n` : "[현장 상태]\n아직 공유된 현장 상태가 없습니다.\n지도에서 바로 현장 상황을 공유해 주세요.\n\n"}${festival.description}`,
                            is_official: true
                        });
                        setSheetHeight(50);
                        setClickedLatLng(null);
                        mapRef.current.panTo(createLatLng(festival.lat, festival.lng));
                    }}
                    onReport={() => {
                        openGlobalBottomSheet("liveCreate", {
                            mode: "share",
                            eventId: festival.id,
                            defaultPlaceName: festival.title,
                            address: festival.address,
                            latitude: festival.lat,
                            longitude: festival.lng,
                        });
                    }}
                />
            );

            const marker = new window.kakao.maps.CustomOverlay({
                position: createLatLng(festival.lat, festival.lng),
                map: mapRef.current,
                content: el,
                xAnchor: 0.5,
                yAnchor: 1,
            });
            markersRef.current.push({ marker, root });
        });
        }
    }, [clickedAddress, clickedLatLng, expandedCardId, markers, officialEvents, selectedCategory, selectedEventId, clearRenderedMarkers, handleOpenCreateAt, openGlobalBottomSheet]);

    useEffect(() => {
        if (mapRef.current) {
            renderMarkers();
        }
    }, [renderMarkers]);

    return (
        <div className="relative w-full h-[100dvh] bg-background overflow-hidden flex flex-col max-w-md mx-auto shadow-2xl">
            <div className="absolute top-6 left-5 right-5 z-50 pointer-events-none">
                <div className="flex flex-col space-y-3">
                    <MapHeader 
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onSearchSubmit={handleSearch}
                        onClear={() => setSearchQuery("")}
                        onBack={() => router.back()}
                        onFocus={() => setIsResultOpen(true)}
                    />

                    <MapOverlay 
                        categories={CATEGORIES}
                        selectedCategory={selectedCategory}
                        onCategorySelect={setSelectedCategory}
                        isResultOpen={isResultOpen}
                        searchResults={searchResults}
                        onSelectPlace={handleSelectPlace}
                    />
                </div>
            </div>

            <div className="relative flex-1 w-full" style={{ minHeight: 'calc(100dvh - 15vh)' }}>
                <div id="map-container" className="absolute inset-0 w-full h-full bg-gray-100" />
            </div>

            <MapBottomSheet 
                sheetHeight={sheetHeight}
                markers={markers}
                expandedCardId={expandedCardId}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onCardClick={(id, lat, lng) => {
                    setExpandedCardId(expandedCardId === id ? null : id);
                    if (expandedCardId !== id && mapRef.current) {
                        mapRef.current.panTo(createLatLng(lat, lng));
                        setSheetHeight(50);
                        setClickedLatLng(null);
                    }
                }}
                onOpenCreate={(mode) => {
                    if (clickedLatLng) {
                        handleOpenCreateAt(mode, clickedLatLng.lat, clickedLatLng.lng, clickedAddress || "", clickedPlaceName || undefined);
                    } else {
                        const center = mapRef.current.getCenter();
                        const { lat, lng } = getLatLngPoint(center);
                        handleOpenCreateAt(mode, lat, lng, storeAddress);
                    }
                }}
            />
        </div>
    );
}

export default function MapPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><div className="w-12 h-12 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin"></div></div>}>
            <MapContent />
        </Suspense>
    );
}
