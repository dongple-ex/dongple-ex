"use client";

import { useEffect } from "react";
import { getAlbumMemories } from "@/lib/albumMemory";
import {
  buildInterestPlaceNotification,
  findMatchingInterestPlace,
  getInterestPlaceTargets,
  getPostPlaceName,
  getStatusPlaceName,
  hasLocalInterestPlaceNotification,
} from "@/lib/interestPlaceNotifications";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store/authStore";
import { useNotificationStore } from "@/lib/store/notificationStore";
import type { Post } from "@/services/postService";
import type { LiveStatus } from "@/services/statusService";

export default function InterestPlaceNotificationWatcher() {
  const userId = useAuthStore((state) => state.userId);
  const isAuthInitialized = useAuthStore((state) => state.isAuthInitialized);
  const prependNotification = useNotificationStore((state) => state.prepend);

  useEffect(() => {
    if (!isAuthInitialized || !userId) return;

    const notifyForPost = (post: Partial<Post>) => {
      if (!post.id || post.user_id === userId) return;

      const placeName = getPostPlaceName(post);
      const matchingPlace = findMatchingInterestPlace(placeName, getInterestPlaceTargets(getAlbumMemories()));
      if (!placeName || !matchingPlace) return;

      const notification = buildInterestPlaceNotification({
        userId,
        sourceId: post.id,
        sourceType: "post",
        placeName,
        title: post.title,
        content: post.content,
        createdAt: post.created_at,
      });

      if (!notification.dedupe_key || hasLocalInterestPlaceNotification(userId, notification.dedupe_key)) return;
      prependNotification(notification);
    };

    const notifyForStatus = (status: Partial<LiveStatus>) => {
      if (!status.id || status.user_id === userId || status.is_request) return;

      const placeName = getStatusPlaceName(status);
      const matchingPlace = findMatchingInterestPlace(placeName, getInterestPlaceTargets(getAlbumMemories()));
      if (!placeName || !matchingPlace) return;

      const notification = buildInterestPlaceNotification({
        userId,
        sourceId: status.id,
        sourceType: "status",
        placeName,
        title: status.status,
        content: status.message,
        createdAt: status.created_at,
      });

      if (!notification.dedupe_key || hasLocalInterestPlaceNotification(userId, notification.dedupe_key)) return;
      prependNotification(notification);
    };

    const channel = supabase
      .channel(`interest-place-updates:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
        },
        (payload) => notifyForPost(payload.new as Partial<Post>),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_status",
        },
        (payload) => notifyForStatus(payload.new as Partial<LiveStatus>),
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isAuthInitialized, prependNotification, userId]);

  return null;
}
