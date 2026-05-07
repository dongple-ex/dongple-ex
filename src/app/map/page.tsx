"use client";

import { useState, useRef, useEffect, Suspense, useCallback, useMemo } from "react";
import { fetchLiveStatus, getEventStatusSummary, LiveStatus, subscribeLiveUpdates, verifyStatusWithTrust } from "@/services/statusService";
import { getAddressFromCoords, getCoordsFromAddress, searchPlaces, getNearestPlace } from "@/services/api";
import { fetchOfficialEvents } from "@/services/eventService";
import { createRoot } from "react-dom/client";
import PulseMarker from "@/components/map/PulseMarker";
import { useRouter, useSearchParams } from "next/navigation";
import { useUIStore } from "@/lib/store/uiStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useLocationStore } from "@/lib/store/locationStore";
import { getEventPeriodPhase, getEventStatusBlock } from "@/lib/eventPeriod";
import { saveRecentMapPlace } from "@/lib/mapRecentPlaces";
import { getPersistentUserId } from "@/lib/auth-utils";
import { 
    Home, Trees, Coffee, Store, PartyPopper
} from "lucide-react";

// New Components
import MapHeader from "@/features/map/components/MapHeader";
import MapOverlay from "@/features/map/components/MapOverlay";
import MapBottomSheet from "@/features/map/components/MapBottomSheet";
import { StatusMarker, ClickTargetMarker } from "@/features/map/components/Markers";

type MapPoint = { lat: number; lng: number };
type KakaoMaps = NonNullable<Window["kakao"]>["maps"];
type KakaoLatLng = InstanceType<KakaoMaps["LatLng"]>;
type KakaoMapInstance = InstanceType<KakaoMaps["Map"]>;
type RenderMarkers = () => void;
type KakaoOverlay = { 
    setMap: (map: KakaoMapInstance | null) => void;
    getPosition: () => KakaoLatLng;
};

type SearchResultItem = {
    title: string;
    mapx: string;
    mapy: string;
    roadAddress?: string;
    address?: string;
};

type OfficialEventMarker = Awaited<ReturnType<typeof fetchOfficialEvents>>[number];

type MarkerEntry = {
    marker: KakaoOverlay;
    root: ReturnType<typeof createRoot> | null;
};

const CATEGORIES = [
    { id: "전체", label: "전체", icon: Home },
    { id: "행사", label: "행사", icon: PartyPopper },
    { id: "카페", label: "카페", icon: Coffee },
    { id: "식당", label: "식당", icon: Store },
    { id: "공원", label: "공원", icon: Trees },
];

const createLatLng = (lat: number, lng: number) => {
    // 좌표 유효성 검사 (WGS84 범위 내 인지 확인)
    const isValid = isFinite(lat) && isFinite(lng) && lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
    if (!isValid) {
        console.warn(`[Map] Invalid coordinates detected: lat=${lat}, lng=${lng}. Falling back to default.`);
        return new window.kakao!.maps.LatLng(37.2995, 126.9912); // 수원 정자동 기본값
    }
    return new window.kakao!.maps.LatLng(lat, lng);
};

const getLatLngPoint = (latlng: KakaoLatLng) => ({
    lat: latlng.getLat(),
    lng: latlng.getLng(),
});

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
    const { userId } = useAuthStore();

    const [markers, setMarkers] = useState<LiveStatus[]>([]);
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [isResultOpen, setIsResultOpen] = useState(false);
    const [sheetHeight, setSheetHeight] = useState(35);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("전체");
    const [isMapReady, setIsMapReady] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Click-to-Pin states
    const [clickedLatLng, setClickedLatLng] = useState<MapPoint | null>(null);
    const [clickedAddress, setClickedAddress] = useState<string | null>(null);
    const [clickedPlaceName, setClickedPlaceName] = useState<string | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | number | null>(null);

    const mapRef = useRef<KakaoMapInstance | null>(null);
    const markersRef = useRef<MarkerEntry[]>([]);
    const clickMarkerRef = useRef<KakaoOverlay | null>(null);
    const handledInitialActionRef = useRef(false);
    const [officialEvents, setOfficialEvents] = useState<OfficialEventMarker[]>([]);
    const officialEventsRef = useRef<OfficialEventMarker[]>([]);
    const renderMarkersRef = useRef<RenderMarkers>(() => {});
    const isFetchingOfficial = useRef(false);

    useEffect(() => {
        officialEventsRef.current = officialEvents;
    }, [officialEvents]);
    const startY = useRef(0);
    const startHeight = useRef(35);

    const loadData = useCallback(async () => {
        try {
            const data = await fetchLiveStatus(showHistory);
            setMarkers(data);
        } catch (error) {
            console.error("Data load failed:", error);
        }
    }, [showHistory]);

    useEffect(() => {
        loadData();
        const sub = subscribeLiveUpdates(loadData);
        return () => { sub.unsubscribe(); };
    }, [loadData]);

    const handleVerify = async (statusId: string) => {
        let finalUserId = userId;

        if (!finalUserId) {
            finalUserId = getPersistentUserId();
        }

        try {
            const isSuccess = await verifyStatusWithTrust(statusId, finalUserId);
            if (isSuccess) {
                await loadData();
                alert("확인이 반영되었습니다!");
            } else {
                alert("이미 확인하신 정보입니다.");
            }
            return isSuccess;
        } catch (error) {
            console.error("Verify failed:", error);
            alert("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            return false;
        }
    };

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
        const newHeight = Math.max(24, Math.min(92, startHeight.current - deltaVH));
        setSheetHeight(newHeight);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);

        // 클릭 이벤트로 간주 (드래그 거리가 10px 미만인 경우)
        if (Math.abs(e.clientY - startY.current) < 10) {
            if (sheetHeight < 50) setSheetHeight(65); // 아래쪽에 있으면 반쯤 올리기
            else setSheetHeight(35); // 반쯤이거나 위에 있으면 내리기
            return;
        }

        if (sheetHeight > 70) setSheetHeight(92);
        else if (sheetHeight > 45) setSheetHeight(65);
        else setSheetHeight(35);
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
                    setClickedPlaceName(queryToSearch);
                    saveRecentMapPlace({
                        title: queryToSearch,
                        address: addr.fullAddress,
                        latitude: coords.lat,
                        longitude: coords.lng,
                    });
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
                saveRecentMapPlace({
                    title: place.title,
                    address: place.roadAddress || place.address || place.title,
                    latitude: lat,
                    longitude: lng,
                });
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

        // 지도가 렌더링되지 않는 이슈 해결을 위해 relayout 호출
        setTimeout(() => {
            if (map) map.relayout();
        }, 100);

        mapRef.current = map;
        setIsMapReady(true);
        console.log("[Map] Map initialized successfully.");

        window.kakao.maps.event.addListener(map, 'idle', async () => {
            const center = map.getCenter();
            const { lat, lng } = getLatLngPoint(center);
            
            // 좌표가 0이거나 이상한 경우 건너뜀
            if (lat === 0 || lng === 0) return;

            const addrResult = await getAddressFromCoords(lat, lng);
            setLocation(lat, lng, addrResult.fullAddress, addrResult.regionName);
            
            // 지도가 멈췄을 때 마커 렌더링 보장
            renderMarkersRef.current();
        });

        window.kakao.maps.event.addListener(map, 'click', async (e) => {
            if (!e?.latLng) return;
            const { lat, lng } = getLatLngPoint(e.latLng);
            
            // Check for nearby official events
            let nearestEvent: OfficialEventMarker | null = null;
            let minDistance = Infinity;
            
            for (const event of officialEventsRef.current) {
                const dist = Math.sqrt(Math.pow(event.lat - lat, 2) + Math.pow(event.lng - lng, 2));
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestEvent = event;
                }
            }

            if (nearestEvent && minDistance < 0.0003) {
                setSelectedEventId(nearestEvent.id);
                setClickedLatLng(null);
                setSheetHeight(35);
                setExpandedCardId(null);
                setIsResultOpen(false);
                return;
            }

            setSelectedEventId(null);
            setClickedLatLng({ lat, lng });
            
            const addrResult = await getAddressFromCoords(lat, lng);
            setClickedAddress(addrResult.fullAddress);
            
            const nearest = await getNearestPlace(lat, lng);
            if (nearest) {
                setClickedPlaceName(nearest.title);
                if (nearest.roadAddress || nearest.address) {
                    setClickedAddress(nearest.roadAddress || nearest.address || addrResult.fullAddress);
                }
            } else {
                setClickedPlaceName(null);
            }

            setSheetHeight(35);
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

    useEffect(() => {
        if (!isMapReady || !mapRef.current) return;

        const latParam = Number(searchParams.get("lat"));
        const lngParam = Number(searchParams.get("lng"));
        const titleParam = searchParams.get("title") || "";
        const addressParam = searchParams.get("address") || "";
        const modeParam = searchParams.get("mode");

        if (Number.isFinite(latParam) && Number.isFinite(lngParam)) {
            mapRef.current.setCenter(createLatLng(latParam, lngParam));
            mapRef.current.setLevel(3);
            setClickedLatLng({ lat: latParam, lng: lngParam });
            setClickedPlaceName(titleParam || null);
            setClickedAddress(addressParam || titleParam || "");
            setSelectedEventId(null);
            setExpandedCardId(null);
            setSheetHeight(35);
        }

        if (modeParam === "share" && !handledInitialActionRef.current) {
            handledInitialActionRef.current = true;
            const center = mapRef.current.getCenter();
            const { lat, lng } = getLatLngPoint(center);
            handleOpenCreateAt("share", lat, lng, addressParam || "");
        }
    }, [handleOpenCreateAt, isMapReady, searchParams]); // storeAddress 제거 (무한 루프 방지)

    const visiblePlaceMarkers = useMemo(
        () => markers.filter((marker) => !marker.event_id && !marker.tourapi_content_id),
        [markers],
    );

    const renderMarkers = useCallback(() => {
        if (!window.kakao?.maps || !mapRef.current) return;
        const map = mapRef.current;

        if (clickMarkerRef.current) {
            const currentPos = clickMarkerRef.current.getPosition();
            if (clickedLatLng && currentPos.getLat() === clickedLatLng.lat && currentPos.getLng() === clickedLatLng.lng) {
                // 이미 같은 위치에 마커가 있으면 스킵 (깜빡임 방지)
            } else {
                clickMarkerRef.current.setMap(null);
                clickMarkerRef.current = null;
            }
        }

        clearRenderedMarkers();

        // 1. Click-to-Pin Marker
        if (clickedLatLng && !clickMarkerRef.current) {
            const el = document.createElement('div');
            el.addEventListener('click', (e) => e.stopPropagation());
            el.addEventListener('mousedown', (e) => e.stopPropagation());
            el.addEventListener('touchstart', (e) => e.stopPropagation());
            const root = createRoot(el);

            root.render(
                <ClickTargetMarker 
                    address={clickedAddress || ""} 
                    placeName={clickedPlaceName || undefined} 
                    onReport={() => handleOpenCreateAt("share", clickedLatLng.lat, clickedLatLng.lng, clickedAddress || "", clickedPlaceName || undefined)} 
                    onRequest={() => handleOpenCreateAt("request", clickedLatLng.lat, clickedLatLng.lng, clickedAddress || "", clickedPlaceName || undefined)}
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

        // 2. Live Status Markers
        visiblePlaceMarkers
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
                        setSheetHeight(65);
                        setClickedLatLng(null);
                        map.panTo(createLatLng(m.latitude || 37.3015, m.longitude || 126.9930));
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
                        isExpired={new Date(m.expires_at).getTime() < Date.now()}
                    />
                </div>
            );

            const marker = new window.kakao.maps.CustomOverlay({
                position: createLatLng(m.latitude || 37.3015, m.longitude || 126.9930),
                map,
                content: el,
                xAnchor: 0.5,
                yAnchor: 1,
            });
            markersRef.current.push({ marker, root });
        });

        // 3. Official Event Markers
        if (selectedCategory !== "카페" && selectedCategory !== "식당" && selectedCategory !== "공원") {
            officialEvents.forEach(festival => {
            const el = document.createElement('div');
            el.addEventListener('click', (e) => e.stopPropagation());
            el.addEventListener('mousedown', (e) => e.stopPropagation());
            el.addEventListener('touchstart', (e) => e.stopPropagation());
            const root = createRoot(el);
            const phase = getEventPeriodPhase(festival.event_start_date, festival.event_end_date);
            const statusSummary = phase === "active" ? getEventStatusSummary(festival, markers) : null;
            const isSelected = selectedEventId === festival.id;

            root.render(
                <PulseMarker 
                    title={festival.title} 
                    category="행사"
                    status={statusSummary?.level}
                    statusLabel={statusSummary?.label}
                    updatedAgo={statusSummary?.updatedAgo}
                    isSelected={isSelected}
                    onClick={() => {
                        setSelectedEventId(festival.id);
                        const activeStatusText = statusSummary
                            ? `[현장 상태]\n${statusSummary.label} (${statusSummary.updatedAgo})\n${statusSummary.latestMessage || "최근 현장 공유가 있습니다."}\n\n`
                            : "[현장 상태]\n아직 공유된 현장 상태가 없습니다.\n행사 현장 공유로 첫 상태를 남겨보세요.\n\n";
                        openGlobalBottomSheet("postDetail", {
                            id: festival.id,
                            eventId: festival.id,
                            defaultPlaceName: festival.title,
                            address: festival.address,
                            latitude: festival.lat,
                            longitude: festival.lng,
                            eventStartDate: festival.event_start_date,
                            eventEndDate: festival.event_end_date,
                            eventPhase: phase,
                            title: festival.title,
                            content: `${festival.address}\n일시: ${festival.event_start_date} ~ ${festival.event_end_date}\n\n${getEventStatusBlock(festival.event_start_date, festival.event_end_date, activeStatusText)}\n\n${festival.description}`,
                            is_official: true,
                            source: festival.source,
                            meta: festival.meta
                        });
                        setSheetHeight(65);
                        setClickedLatLng(null);
                        map.panTo(createLatLng(festival.lat, festival.lng));
                    }}
                    onReport={() => {
                        if (getEventPeriodPhase(festival.event_start_date, festival.event_end_date) !== "active") {
                            openGlobalBottomSheet("postDetail", {
                                id: festival.id,
                                eventId: festival.id,
                                defaultPlaceName: festival.title,
                                address: festival.address,
                                latitude: festival.lat,
                                longitude: festival.lng,
                                eventStartDate: festival.event_start_date,
                                eventEndDate: festival.event_end_date,
                                eventPhase: phase,
                                title: festival.title,
                                content: `${festival.address}\n일시: ${festival.event_start_date} ~ ${festival.event_end_date}\n\n${getEventStatusBlock(festival.event_start_date, festival.event_end_date, "")}\n\n${festival.description}`,
                                is_official: true,
                                source: festival.source,
                                meta: festival.meta
                            });
                            return;
                        }
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
                map,
                content: el,
                xAnchor: 0.5,
                yAnchor: 1,
            });
            markersRef.current.push({ marker, root });
        });
        }
    }, [clickedAddress, clickedLatLng, clickedPlaceName, expandedCardId, markers, visiblePlaceMarkers, officialEvents, selectedCategory, selectedEventId, clearRenderedMarkers, handleOpenCreateAt, openGlobalBottomSheet]);

    useEffect(() => {
        renderMarkersRef.current = renderMarkers;
    }, [renderMarkers]);

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

            <div className="relative flex-1 w-full bg-background overflow-hidden" style={{ minHeight: '300px' }}>
                <div 
                    id="map-container" 
                    className="w-full h-full" 
                    style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%',
                        zIndex: 0
                    }} 
                />
            </div>

            <MapBottomSheet 
                sheetHeight={sheetHeight}
                markers={visiblePlaceMarkers}
                expandedCardId={expandedCardId}
                showHistory={showHistory}
                onToggleHistory={() => setShowHistory(!showHistory)}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onCardClick={(id, lat, lng) => {
                    setExpandedCardId(expandedCardId === id ? null : id);
                    if (expandedCardId !== id && mapRef.current) {
                        mapRef.current.panTo(createLatLng(lat, lng));
                        setSheetHeight(65);
                        setClickedLatLng(null);
                    }
                }}
                onOpenCreate={(mode, lat, lng, address, placeName) => {
                    if (lat && lng) {
                        handleOpenCreateAt(mode, lat, lng, address || storeAddress, placeName);
                    } else if (clickedLatLng) {
                        handleOpenCreateAt(mode, clickedLatLng.lat, clickedLatLng.lng, clickedAddress || "", clickedPlaceName || undefined);
                    } else {
                        const center = mapRef.current?.getCenter();
                        if (!center) return;
                        const { lat: cLat, lng: cLng } = getLatLngPoint(center);
                        handleOpenCreateAt(mode, cLat, cLng, storeAddress);
                    }
                }}
                onVerify={handleVerify}
                onToggleHeight={() => {
                    if (sheetHeight < 50) setSheetHeight(65);
                    else setSheetHeight(35);
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
