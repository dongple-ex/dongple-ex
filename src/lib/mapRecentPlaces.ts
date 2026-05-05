"use client";

export interface RecentMapPlace {
  id: string;
  title: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

type SaveRecentMapPlaceInput = {
  title: string;
  address?: string;
  latitude?: number;
  longitude?: number;
};

const STORAGE_KEY = "dongple.map.recentPlaces";
const UPDATE_EVENT = "dongple:map-recent-updated";
const MAX_RECENT_PLACES = 8;

function isBrowser() {
  return typeof window !== "undefined";
}

function parseRecentPlaces(raw: string | null) {
  if (!raw) return [] as RecentMapPlace[];

  try {
    const parsed = JSON.parse(raw) as RecentMapPlace[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function emitUpdate() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function getRecentMapPlaces() {
  if (!isBrowser()) return [] as RecentMapPlace[];

  return parseRecentPlaces(window.localStorage.getItem(STORAGE_KEY)).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function saveRecentMapPlace(input: SaveRecentMapPlaceInput) {
  if (!isBrowser() || !input.title.trim()) return null;

  const nextPlace: RecentMapPlace = {
    id: `${input.title}-${input.latitude || ""}-${input.longitude || ""}`,
    title: input.title.trim(),
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    createdAt: new Date().toISOString(),
  };

  const nextPlaces = [
    nextPlace,
    ...getRecentMapPlaces().filter((place) => place.id !== nextPlace.id),
  ].slice(0, MAX_RECENT_PLACES);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPlaces));
  emitUpdate();
  return nextPlace;
}

export function subscribeRecentMapPlaces(onUpdate: () => void) {
  if (!isBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === STORAGE_KEY) onUpdate();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(UPDATE_EVENT, onUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(UPDATE_EVENT, onUpdate);
  };
}
