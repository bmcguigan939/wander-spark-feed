import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listComments,
  postComment,
  deleteComment,
  type CommentRow,
} from "@/lib/comments.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

export function CommentsSheet({
  open,
  onOpenChange,
  videoId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  videoId: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listComments);
  const postFn = useServerFn(postComment);
  const delFn = useServerFn(deleteComment);
  const [body, setBody] = useState("");

  const queryKey = ["comments", videoId];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listFn({ data: { videoId } }),
    enabled: open,
  });

  // Realtime: on any change, refetch.
  useEffect(() => {
    if (!open) return;
    const ch = supabase
      .channel(`comments:${videoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `video_id=eq.${videoId}` },
        () => {
          qc.invalidateQueries({ queryKey });
          qc.invalidateQueries({ queryKey: ["feed"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [open, videoId, qc]);

  const postM = useMutation({
    mutationFn: () => postFn({ data: { videoId, body: body.trim() } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e: any) => toast(e?.message ?? "Could not post comment"),
  });

  const delM = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const comments: CommentRow[] = data?.comments ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[80dvh] flex-col rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </SheetTitle>
        </SheetHeader>

        <div className="-mx-6 mt-2 flex-1 overflow-y-auto px-6">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Be the first to comment.
            </p>
          ) : (
            <ul className="space-y-4 py-2">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <Link
                    to="/u/$username"
                    params={{ username: c.author?.username ?? "unknown" }}
                    className="flex-shrink-0"
                    onClick={() => onOpenChange(false)}
                  >
                    <img
                      src={
                        c.author?.avatar_url ??
                        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(c.author?.username ?? "u")}`
                      }
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-xs font-semibold">
                        @{c.author?.username ?? "unknown"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="mt-0.5 break-words text-sm">{c.body}</p>
                  </div>
                  {user?.id === c.user_id && (
                    <button
                      aria-label="Delete comment"
                      onClick={() => delM.mutate(c.id)}
                      className="self-start rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border pt-3">
          {user ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!body.trim() || postM.isPending) return;
                postM.mutate();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add a comment…"
                maxLength={2000}
                className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!body.trim() || postM.isPending}
                aria-label="Post comment"
                className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <a
              href="/login"
              className="block w-full rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
            >
              Sign in to comment
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
