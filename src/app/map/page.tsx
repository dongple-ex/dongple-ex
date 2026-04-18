"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { fetchLiveStatus, LiveStatus, subscribeLiveUpdates } from "@/services/statusService";
import { getAddressFromCoords, getCoordsFromAddress, searchPlaces } from "@/services/api";
import { fetchOfficialEvents } from "@/services/eventService";
import Script from "next/script";
import { createRoot } from "react-dom/client";
import PulseMarker from "@/components/map/PulseMarker";
import { useRouter, useSearchParams } from "next/navigation";
import { useUIStore } from "@/lib/store/uiStore";
import { useLocationStore } from "@/lib/store/locationStore";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Home, Trees, Dumbbell, Coffee, ShoppingBag, Store, ParkingCircle, HeartPulse, Building2 
} from "lucide-react";

// New Components
import MapHeader from "@/features/map/components/MapHeader";
import MapOverlay from "@/features/map/components/MapOverlay";
import MapBottomSheet from "@/features/map/components/MapBottomSheet";
import { StatusMarker, ClickTargetMarker } from "@/features/map/components/Markers";

declare global {
  interface Window {
    naver: any;
  }
}

const CATEGORIES = [
    { id: "전체", label: "전체", icon: Home },
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
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isResultOpen, setIsResultOpen] = useState(false);
    const [isMapLoading, setIsMapLoading] = useState(true);
    const [isMapMoving, setIsMapMoving] = useState(false);
    const [sheetHeight, setSheetHeight] = useState(24);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("전체");

    // Click-to-Pin states
    const [clickedLatLng, setClickedLatLng] = useState<{ lat: number, lng: number } | null>(null);
    const [clickedAddress, setClickedAddress] = useState<string | null>(null);

    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const rootsRef = useRef<any[]>([]);
    const tempMarkerRef = useRef<any>(null);
    const clickMarkerRef = useRef<any>(null);
    const [officialEvents, setOfficialEvents] = useState<any[]>([]);
    const isFetchingOfficial = useRef(false);
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
    }, [markers, officialEvents, expandedCardId, clickedLatLng]);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(true);
        startY.current = e.clientY;
        startHeight.current = sheetHeight;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const deltaVH = ((e.clientY - startY.current) / window.innerHeight) * 100;
        let newHeight = Math.max(15, Math.min(92, startHeight.current - deltaVH));
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
                    mapRef.current.setCenter(new window.naver.maps.LatLng(coords.lat, coords.lng));
                    setClickedLatLng(coords);
                    const addr = await getAddressFromCoords(coords.lat, coords.lng);
                    setClickedAddress(addr.fullAddress);
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
                setClickedLatLng({ lat: latlng.y, lng: latlng.x });
                setClickedAddress(place.roadAddress || place.address);
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
        });

        window.naver.maps.Event.addListener(map, 'click', async (e: any) => {
            const latlng = e.coord;
            setClickedLatLng({ lat: latlng.y, lng: latlng.x });
            const addrResult = await getAddressFromCoords(latlng.y, latlng.x);
            setClickedAddress(addrResult.fullAddress);
            setSheetHeight(15);
            setExpandedCardId(null);
            setIsResultOpen(false);
        });

        window.naver.maps.Event.addListener(map, 'dragstart', () => {
            setIsMapMoving(true);
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
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.naver?.maps && !mapRef.current) {
            initMap();
        }
    }, []);

    const handleOpenCreateAt = (mode: string, lat: number, lng: number, address: string) => {
        openGlobalBottomSheet("liveCreate", {
            mode,
            address,
            latitude: lat,
            longitude: lng
        });
    };

    const renderMarkers = () => {
        if (!window.naver?.maps || !mapRef.current) return;

        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];
        rootsRef.current.forEach(root => root.unmount());
        rootsRef.current = [];

        if (clickMarkerRef.current) clickMarkerRef.current.setMap(null);

        // 1. Click-to-Pin Marker
        if (clickedLatLng) {
            const el = document.createElement('div');
            const root = createRoot(el);
            rootsRef.current.push(root);

            root.render(
                <ClickTargetMarker 
                    address={clickedAddress || ""} 
                    onReport={() => handleOpenCreateAt("share", clickedLatLng.lat, clickedLatLng.lng, clickedAddress || "")} 
                />
            );

            const marker = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(clickedLatLng.lat, clickedLatLng.lng),
                map: mapRef.current,
                icon: { content: el, anchor: new window.naver.maps.Point(0, 0) }
            });
            clickMarkerRef.current = marker;
        }

        // 2. Live Status Markers (Shape: Balloon with status dot)
        markers
            .filter(m => selectedCategory === "전체" || m.category === selectedCategory)
            .forEach(m => {
            const isSelected = expandedCardId === m.id;
            const el = document.createElement('div');
            const root = createRoot(el);
            rootsRef.current.push(root);

            root.render(
                <StatusMarker 
                    status={m.status} 
                    isRequest={m.is_request} 
                    isSelected={isSelected} 
                />
            );

            const marker = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(m.latitude || 37.3015, m.longitude || 126.9930),
                map: mapRef.current,
                icon: { content: el, anchor: new window.naver.maps.Point(0, 0) }
            });

            window.naver.maps.Event.addListener(marker, 'click', () => {
                setExpandedCardId(m.id);
                setSheetHeight(50);
                setClickedLatLng(null); 
                mapRef.current.panTo(marker.getPosition());
                setTimeout(() => {
                    const el = document.getElementById(`card-${m.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            });
            markersRef.current.push(marker);
        });

        // 3. Official Event Markers (Shape: Circular Pulse)
        officialEvents.forEach(festival => {
            const el = document.createElement('div');
            const root = createRoot(el);
            rootsRef.current.push(root);

            root.render(
                <PulseMarker 
                    title={festival.title} 
                    category={festival.category_code} 
                    onClick={() => {
                        openGlobalBottomSheet("postDetail", {
                            title: festival.title,
                            content: `${festival.address}\n일시: ${festival.event_start_date} ~ ${festival.event_end_date}\n${festival.description}`,
                            is_official: true
                        });
                        setSheetHeight(50);
                        setClickedLatLng(null);
                        mapRef.current.panTo(new window.naver.maps.LatLng(festival.lat, festival.lng));
                    }}
                />
            );

            const marker = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(festival.lat, festival.lng),
                map: mapRef.current,
                icon: { content: el, anchor: new window.naver.maps.Point(0, 0) }
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
                        mapRef.current.panTo(new window.naver.maps.LatLng(lat, lng));
                        setSheetHeight(50);
                        setClickedLatLng(null);
                    }
                }}
                onOpenCreate={(mode) => {
                    if (clickedLatLng) {
                        handleOpenCreateAt(mode, clickedLatLng.lat, clickedLatLng.lng, clickedAddress || "");
                    } else {
                        const center = mapRef.current.getCenter();
                        handleOpenCreateAt(mode, center.y, center.x, storeAddress);
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
