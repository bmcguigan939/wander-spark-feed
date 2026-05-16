import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import { listMyCollections, createCollection } from "@/lib/collections.functions";
import { Plus, Bookmark, Globe, Lock } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/collections")({
  head: () => ({ meta: [{ title: "Collections — Travidz" }] }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const listFn = useServerFn(listMyCollections);
  const createFn = useServerFn(createCollection);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [vis, setVis] = useState<"private" | "public">("private");

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const { data } = useQuery({
    queryKey: ["my-collections"],
    queryFn: () => listFn({ data: undefined as any }),
    enabled: !!user,
  });
  const createM = useMutation({
    mutationFn: () => createFn({ data: { title, visibility: vis } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-collections"] }); setOpen(false); setTitle(""); },
  });

  if (!user) return <MobileShell><div className="px-5 pt-10 text-sm text-muted-foreground">Loading…</div></MobileShell>;
  const collections = data?.collections ?? [];

  return (
    <MobileShell>
      <div className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Collections</h1>
          <button onClick={() => setOpen(true)} className="rounded-full bg-primary p-2.5 text-primary-foreground"><Plus className="h-4 w-4" /></button>
        </div>
        {collections.length === 0 ? (
          <div className="mt-16 text-center">
            <Bookmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No collections yet.</p>
            <button onClick={() => setOpen(true)} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Create your first</button>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3">
            {collections.map((c) => (
              <li key={c.id}>
                <Link to="/collections/$id" params={{ id: c.id }} className="block rounded-2xl border border-border bg-card p-4">
                  <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20"><Bookmark className="h-7 w-7 text-primary-foreground" /></div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-sm font-semibold">{c.title}</h3>
                    {c.visibility === "public" ? <Globe className="h-3.5 w-3.5 text-muted-foreground" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.item_count} video{c.item_count === 1 ? "" : "s"}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader><SheetTitle>New collection</SheetTitle></SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) createM.mutate(); }} className="mt-4 space-y-3">
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
            <div className="flex gap-2">
              {(["private", "public"] as const).map((v) => (
                <button type="button" key={v} onClick={() => setVis(v)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm capitalize ${vis === v ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}>
                  {v === "public" ? <Globe className="mr-1 inline h-3.5 w-3.5" /> : <Lock className="mr-1 inline h-3.5 w-3.5" />}{v}
                </button>
              ))}
            </div>
            <button disabled={!title.trim() || createM.isPending} className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">Create</button>
          </form>
        </SheetContent>
      </Sheet>
    </MobileShell>
  );
}
