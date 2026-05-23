import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Subscribes to realtime changes on the current creator's videos.
 * Invalidates studio query caches so the UI updates the moment Mux
 * finishes processing (status: processing → ready) — no manual refresh.
 */
export function useRealtimeMyVideos() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`studio-videos:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "videos",
          filter: `creator_id=eq.${userId}`,
        },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["studio-videos"] });
          qc.invalidateQueries({ queryKey: ["studio-overview"] });

          // Friendly toast when a video finishes processing.
          const oldRow = payload.old as { status?: string } | null;
          const newRow = payload.new as { status?: string; title?: string | null } | null;
          if (
            payload.eventType === "UPDATE" &&
            oldRow?.status === "processing" &&
            newRow?.status === "ready"
          ) {
            const title = newRow.title?.trim() || "Your video";
            toast(`${title} is ready`);
          } else if (
            payload.eventType === "UPDATE" &&
            newRow?.status === "errored" &&
            oldRow?.status !== "errored"
          ) {
            toast.error(`${newRow.title?.trim() || "A video"} failed to process`);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
}