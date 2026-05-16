import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { getCollection, deleteCollection, removeFromCollection, updateCollection } from "@/lib/collections.functions";
import { ArrowLeft, Globe, Lock, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/collections/$id")({
  head: () => ({
    meta: [
      { title: "Collection — Travidz" },
      { name: "description", content: "A curated collection of travel videos on Travidz." },
    ],
  }),
  component: CollectionDetail,
});

function CollectionDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getCollection);
  const delFn = useServerFn(deleteCollection);
  const removeFn = useServerFn(removeFromCollection);
  const updateFn = useServerFn(updateCollection);

  const { data, isLoading } = useQuery({
    queryKey: ["collection", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const delM = useMutation({
    mutationFn: () => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-collections"] }); toast("Collection deleted"); navigate({ to: "/collections" }); },
  });
  const removeM = useMutation({
    mutationFn: (videoId: string) => removeFn({ data: { collectionId: id, videoId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collection", id] }),
  });
  const visibility = data?.collection?.visibility ?? "private";
  const toggleVisM = useMutation({
    mutationFn: () => updateFn({ data: { id, visibility: visibility === "public" ? "private" : "public" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collection", id] }),
  });
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <MobileShell>
      <div className="px-5 pt-6">
        <Link to="/collections" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Collections</Link>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data?.collection && (
          <>
            <h1 className="text-2xl font-bold">{data.collection.title}</h1>
            {data.collection.description && <p className="mt-1 text-sm text-muted-foreground">{data.collection.description}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => toggleVisM.mutate()} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                {visibility === "public" ? <><Globe className="h-3.5 w-3.5" /> Public</> : <><Lock className="h-3.5 w-3.5" /> Private</>}
              </button>
              <button onClick={() => setConfirmDel(true)} className="flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
            {confirmDel && (
              <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
                <p className="text-xs">Delete this collection?</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => delM.mutate()} className="rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">Confirm</button>
                  <button onClick={() => setConfirmDel(false)} className="rounded-full border border-border px-3 py-1.5 text-xs">Cancel</button>
                </div>
              </div>
            )}
            <div className="mt-6 grid grid-cols-3 gap-1.5">
              {data.videos.map((v: any) => (
                <div key={v.id} className="relative aspect-[9/14] overflow-hidden rounded-md bg-card">
                  {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">No preview</div>}
                  <button onClick={() => removeM.mutate(v.id)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            {data.videos.length === 0 && <p className="mt-10 text-center text-sm text-muted-foreground">Empty collection.</p>}
          </>
        )}
      </div>
    </MobileShell>
  );
}
