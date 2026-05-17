import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { seedDemoContent, resetDemoContent } from "@/lib/admin-seed.functions";
import { Sparkles, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/seed")({
  head: () => ({ meta: [{ title: "Seed demo content — Admin" }] }),
  component: SeedPage,
});

function SeedPage() {
  const seedFn = useServerFn(seedDemoContent);
  const resetFn = useServerFn(resetDemoContent);
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