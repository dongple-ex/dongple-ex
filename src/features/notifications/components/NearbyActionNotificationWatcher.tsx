"use client";

import { useEffect } from "react";
import {
  buildNearbyActionNotification,
  canCreateNearbyActionNotification,
  isFreshGpsFix,
  recordNearbyActionNotification,
  type NearbyStatusCandidate,
} from "@/lib/nearbyActionNotifications";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store/authStore";
import { useLocationStore } from "@/lib/store/locationStore";
import { useNotificationStore } from "@/lib/store/notificationStore";

function getCandidateRank(candidate: ReturnType<typeof buildNearbyActionNotification>) {
  if (!candidate) return Number.POSITIVE_INFINITY;

  const actionKind = candidate.notification.metadata.action_kind;
  const distance = Number(candidate.notification.metadata.distance_m || Number.POSITIVE_INFINITY);
  const actionRank = actionKind === "answer_request" ? 0 : 1;

  return actionRank * 100000 + distance;
}

async function fetchNearbyStatusCandidates() {
  const { data, error } = await supabase
    .from("live_status")
    .select("*")
    .eq("is_hidden", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) throw error;
  return (data || []) as NearbyStatusCandidate[];
}

export default function NearbyActionNotificationWatcher() {
  const userId = useAuthStore((state) => state.userId);
  const isAuthInitialized = useAuthStore((state) => state.isAuthInitialized);
  const hasGpsFix = useLocationStore((state) => state.hasGpsFix);
  const gpsLatitude = useLocationStore((state) => state.gpsLatitude);
  const gpsLongitude = useLocationStore((state) => state.gpsLongitude);
  const accuracy = useLocationStore((state) => state.accuracy);
  const receivedAt = useLocationStore((state) => state.receivedAt);
  const prependNotification = useNotificationStore((state) => state.prepend);

  useEffect(() => {
    if (!isAuthInitialized || !userId || !hasGpsFix) return;

    const gpsFix = {
      latitude: gpsLatitude,
      longitude: gpsLongitude,
      accuracy,
      receivedAt,
    };

    if (!isFreshGpsFix(gpsFix)) return;

    let isCancelled = false;
    const gps = { latitude: Number(gpsLatitude), longitude: Number(gpsLongitude) };

    const notifyCandidate = (status: NearbyStatusCandidate, now = Date.now()) => {
      const candidate = buildNearbyActionNotification(userId, status, gps, now);
      if (!candidate?.notification.dedupe_key) return false;
      if (!canCreateNearbyActionNotification(userId, candidate.notification.dedupe_key, candidate.placeKey, now)) {
        return false;
      }

      prependNotification(candidate.notification);
      recordNearbyActionNotification(userId, candidate.notification.dedupe_key, candidate.placeKey, now);
      return true;
    };

    const scanCurrentStatuses = async () => {
      try {
        const now = Date.now();
        const candidates = (await fetchNearbyStatusCandidates())
          .map((status) => buildNearbyActionNotification(userId, status, gps, now))
          .filter(Boolean)
          .sort((left, right) => getCandidateRank(left) - getCandidateRank(right));

        if (isCancelled) return;

        const selected = candidates.find((candidate) => {
          if (!candidate?.notification.dedupe_key) return false;
          return canCreateNearbyActionNotification(userId, candidate.notification.dedupe_key, candidate.placeKey, now);
        });

        if (!selected?.notification.dedupe_key) return;
        prependNotification(selected.notification);
        recordNearbyActionNotification(userId, selected.notification.dedupe_key, selected.placeKey, now);
      } catch (error) {
        console.warn("Nearby action notification scan skipped:", error);
      }
    };

    scanCurrentStatuses();

    const channel = supabase
      .channel(`nearby-action-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_status",
        },
        (payload) => {
          notifyCandidate(payload.new as NearbyStatusCandidate);
        },
      )
      .subscribe();

    return () => {
      isCancelled = true;
      channel.unsubscribe();
    };
  }, [accuracy, gpsLatitude, gpsLongitude, hasGpsFix, isAuthInitialized, prependNotification, receivedAt, userId]);

  return null;
}

