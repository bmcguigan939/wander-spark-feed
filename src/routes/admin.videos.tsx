import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAdminVideos, setVideoModeration, deleteVideoAdmin } from "@/lib/admin.functions";
import { Eye, EyeOff, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/videos")({
  component: AdminVideos,
});

const FILTERS = ["all", "pending", "hidden", "featured"] as const;

function AdminVideos() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminVideos);
  const setModFn = useServerFn(setVideoModeration);
  const delFn = useServerFn(deleteVideoAdmin);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-videos", filter, q],
    queryFn: () => listFn({ data: { filter, q: q || undefined } }),
  });

  const mod = useMutation({
    mutationFn: (v: { videoId: string; hidden?: boolean; featured?: boolean }) => setModFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-videos"] }),
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (videoId: string) => delFn({ data: { videoId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-videos"] }); toast("Deleted"); },
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });

  return (
    <div className="px-4 py-4 pb-28 space-y-3">
      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            }`}>{f}</button>
        ))}
      </div>
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title…"
        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && data?.videos.length === 0 && <p className="text-sm text-muted-foreground">No videos.</p>}
      <ul className="space-y-2">
        {data?.videos.map((v: any) => (
          <li key={v.id} className="flex gap-3 rounded-2xl border border-border bg-card p-2">
            <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              {v.thumbnail_url && <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <div className="line-clamp-2 text-sm font-medium flex-1">{v.title}</div>
                {v.is_featured && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">★</span>}
                {v.is_hidden && <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">HIDDEN</span>}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                @{v.creator?.username ?? "—"} · {v.status} · {v.like_count} likes
              </div>
              <div className="mt-2 flex gap-1.5">
                <button onClick={() => mod.mutate({ videoId: v.id, hidden: !v.is_hidden })}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold">
                  {v.is_hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {v.is_hidden ? "Unhide" : "Hide"}
                </button>
                <button onClick={() => mod.mutate({ videoId: v.id, featured: !v.is_featured })}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold">
                  <Star className="h-3 w-3" /> {v.is_featured ? "Unfeature" : "Feature"}
                </button>
                <button onClick={() => { if (confirm("Delete video permanently?")) del.mutate(v.id); }}
                  className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
