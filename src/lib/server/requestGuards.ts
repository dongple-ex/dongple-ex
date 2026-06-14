import { NextRequest, NextResponse } from "next/server";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  keyPrefix: string;
  max: number;
  windowMs: number;
};

type BoundedNumberOptions = {
  fallback: number;
  max: number;
  min: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __dongpleRateLimitStore: Map<string, RateLimitBucket> | undefined;
  // eslint-disable-next-line no-var
  var __dongpleRateLimitLastCleanup: number | undefined;
}

const rateLimitStore = globalThis.__dongpleRateLimitStore || new Map<string, RateLimitBucket>();
globalThis.__dongpleRateLimitStore = rateLimitStore;

function cleanupExpiredBuckets(now: number) {
  const lastCleanup = globalThis.__dongpleRateLimitLastCleanup || 0;
  if (rateLimitStore.size < 5000 && now - lastCleanup < 60_000) return;

  Array.from(rateLimitStore.entries()).forEach(([key, bucket]) => {
    if (bucket.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  });
  globalThis.__dongpleRateLimitLastCleanup = now;
}

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    forwardedFor ||
    "local"
  );
}

export function rateLimit(request: NextRequest, options: RateLimitOptions) {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const key = `${options.keyPrefix}:${getClientKey(request)}`;
  const bucket = rateLimitStore.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= options.max) return null;

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(options.max),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
      },
    },
  );
}

export function limitedText(value: string | null, maxLength: number) {
  return (value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function boundedInteger(value: string | null, options: BoundedNumberOptions) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return options.fallback;
  return Math.min(options.max, Math.max(options.min, Math.floor(parsed)));
}

export function boundedNumber(value: string | null, options: BoundedNumberOptions) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return options.fallback;
  return Math.min(options.max, Math.max(options.min, parsed));
}

export function optionalBoundedNumber(value: string | null, min: number, max: number) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export function digitsOnly(value: string | null, maxLength: number) {
  return (value || "").replace(/\D/g, "").slice(0, maxLength);
}

export function isKoreaCoordinate(lat: number, lng: number) {
  return lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
}
