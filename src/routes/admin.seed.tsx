import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { seedDemoContent, resetDemoContent } from "@/lib/admin-seed.functions";
import { syncTikTokOfficial, repairBlankImportedThumbnails } from "@/lib/social.functions";
import { Sparkles, Trash2, RefreshCw, ImageOff } from "lucide-react";

export const Route = createFileRoute("/admin/seed")({
  head: () => ({ meta: [{ title: "Seed demo content — Admin" }] }),
  component: SeedPage,
});

function SeedPage() {
  const seedFn = useServerFn(seedDemoContent);
  const resetFn = useServerFn(resetDemoContent);
  const syncTikTokFn = useServerFn(syncTikTokOfficial);
  const repairThumbsFn = useServerFn(repairBlankImportedThumbnails);
  const [result, setResult] = useState<any>(null);

  const seed = useMutation({
    mutationFn: () => seedFn(),
    onSuccess: (r) => {
      setResult(r);
      toast.success(`Seeded ${r.dealsInserted} deals, ${r.videosInserted} videos`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Seed failed"),
  });
  const reset = useMutation({
    mutationFn: () => resetFn(),
    onSuccess: (r) => toast.success(`Removed ${r.dealsDeleted} deals, ${r.videosDeleted} videos`),
    onError: (e: any) => toast.error(e?.message ?? "Reset failed"),
  });
  const syncTikTok = useMutation({
    mutationFn: () => syncTikTokFn({ data: undefined as any }),
    onSuccess: (r: any) => toast.success(`Synced ${r?.synced ?? 0} of ${r?.scanned ?? 0} TikToks`),
    onError: (e: any) => toast.error(e?.message ?? "TikTok sync failed"),
  });
  const repairThumbs = useMutation({
    mutationFn: () => repairThumbsFn({ data: undefined as any }),
    onSuccess: (r: any) =>
      toast.success(`Repaired ${r?.repaired ?? 0} of ${r?.attempted ?? 0} blank thumbnails`),
    onError: (e: any) => toast.error(e?.message ?? "Repair failed"),
  });

  return (
    <div className="px-4 py-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Creates 3 demo creators + 3 demo businesses (auto-confirmed), then inserts 8 deals
        and 8 videos tagged as demo content. Safe to run multiple times — idempotent on
        username/title.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => seed.mutate()} disabled={seed.isPending}>
          <Sparkles className="h-4 w-4 mr-1" />
          {seed.isPending ? "Seeding…" : "Seed demo content"}
        </Button>
        <Button variant="destructive" onClick={() => reset.mutate()} disabled={reset.isPending}>
          <Trash2 className="h-4 w-4 mr-1" />
          {reset.isPending ? "Removing…" : "Reset demo"}
        </Button>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="text-sm font-semibold mb-1">Official TikTok sync</div>
        <p className="text-xs text-muted-foreground mb-2">
          Pulls the latest TikTok videos from the Travidz official account. Requires TRAVIDZ_OFFICIAL_CREATOR_ID, LOVABLE_API_KEY and TIKTOK_API_KEY.
        </p>
        <Button onClick={() => syncTikTok.mutate()} disabled={syncTikTok.isPending} variant="secondary">
          <RefreshCw className={`h-4 w-4 mr-1 ${syncTikTok.isPending ? "animate-spin" : ""}`} />
          {syncTikTok.isPending ? "Syncing…" : "Sync official TikTok now"}
        </Button>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="text-sm font-semibold mb-1">Repair blank imported thumbnails</div>
        <p className="text-xs text-muted-foreground mb-2">
          Re-runs preview against every link-card video that imported with an empty thumbnail
          (typically Instagram/Facebook posts), and persists whatever the reader proxy can recover.
        </p>
        <Button onClick={() => repairThumbs.mutate()} disabled={repairThumbs.isPending} variant="secondary">
          <ImageOff className={`h-4 w-4 mr-1 ${repairThumbs.isPending ? "animate-spin" : ""}`} />
          {repairThumbs.isPending ? "Repairing…" : "Repair blank thumbnails"}
        </Button>
      </div>
      {result?.users && (
        <div className="rounded-xl border bg-card p-4 text-xs">
          <div className="font-semibold mb-2">Demo accounts (save passwords now — shown once):</div>
          <table className="w-full text-left">
            <thead className="text-muted-foreground">
              <tr><th>Email</th><th>Password</th></tr>
            </thead>
            <tbody>
              {result.users.map((u: any) => (
                <tr key={u.email} className="border-t">
                  <td className="py-1 font-mono">{u.email}</td>
                  <td className="py-1 font-mono">{u.password ?? "(already existed)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}