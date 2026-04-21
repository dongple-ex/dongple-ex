"use client";

export type AlbumMemoryType = "status" | "post";

export interface AlbumMemory {
  id: string;
  sourceId: string;
  type: AlbumMemoryType;
  title: string;
  subtitle: string;
  description: string;
  locationLabel: string;
  category: string;
  createdAt: string;
  statusLabel?: string;
  image: string;
  favorite: boolean;
}

type SaveAlbumMemoryInput = {
  sourceId: string;
  type: AlbumMemoryType;
  title: string;
  subtitle: string;
  description: string;
  locationLabel?: string;
  category?: string;
  createdAt?: string;
  statusLabel?: string;
};

const STORAGE_KEY = "dongple.album.memories";
const UPDATE_EVENT = "dongple:album-updated";

const MEMORY_IMAGES = [
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517420879524-86d64ac2f339?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80",
];

function isBrowser() {
  return typeof window !== "undefined";
}

function emitUpdate() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

function parseMemories(raw: string | null) {
  if (!raw) return [] as AlbumMemory[];

  try {
    const parsed = JSON.parse(raw) as AlbumMemory[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function buildMemoryImage(seed: string) {
  const safeSeed = seed || "dongple";
  const index =
    safeSeed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    MEMORY_IMAGES.length;

  return MEMORY_IMAGES[index];
}

export function getAlbumMemories() {
  if (!isBrowser()) return [] as AlbumMemory[];

  const stored = parseMemories(window.localStorage.getItem(STORAGE_KEY));
  return stored.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function saveAlbumMemory(input: SaveAlbumMemoryInput) {
  if (!isBrowser()) return null;

  const existing = getAlbumMemories();
  const existingIndex = existing.findIndex(
    (memory) => memory.sourceId === input.sourceId && memory.type === input.type,
  );

  const nextMemory: AlbumMemory = {
    id:
      existingIndex >= 0
        ? existing[existingIndex].id
        : `${input.type}-${input.sourceId}-${Date.now()}`,
    sourceId: input.sourceId,
    type: input.type,
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    locationLabel: input.locationLabel || input.title,
    category: input.category || input.subtitle,
    createdAt: input.createdAt || new Date().toISOString(),
    statusLabel: input.statusLabel,
    image: buildMemoryImage(`${input.sourceId}-${input.title}`),
    favorite: existingIndex >= 0 ? existing[existingIndex].favorite : false,
  };

  const nextMemories =
    existingIndex >= 0
      ? existing.map((memory, index) => (index === existingIndex ? nextMemory : memory))
      : [nextMemory, ...existing];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMemories));
  emitUpdate();
  return nextMemory;
}

export function toggleAlbumFavorite(memoryId: string) {
  if (!isBrowser()) return;

  const nextMemories = getAlbumMemories().map((memory) =>
    memory.id === memoryId ? { ...memory, favorite: !memory.favorite } : memory,
  );

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMemories));
  emitUpdate();
}

export function subscribeAlbumMemories(onUpdate: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === STORAGE_KEY) {
      onUpdate();
    }
  };

  const handleCustomUpdate = () => onUpdate();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(UPDATE_EVENT, handleCustomUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(UPDATE_EVENT, handleCustomUpdate);
  };
}
