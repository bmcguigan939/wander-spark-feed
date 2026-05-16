import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyCollections, createCollection, addToCollection } from "@/lib/collections.functions";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { Bookmark, Plus, Lock, Globe } from "lucide-react";
import { toast } from "sonner";

export function AddToCollectionSheet({
  open, onOpenChange, videoId,
}: { open: boolean; onOpenChange: (v: boolean) => void; videoId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyCollections);
  const addFn = useServerFn(addToCollection);
  const createFn = useServerFn(createCollection);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");

  const { data } = useQuery({
    queryKey: ["my-collections"],
    queryFn: () => listFn({ data: undefined as any }),
    enabled: open && !!user,
  });

  const addM = useMutation({
    mutationFn: (collectionId: string) => addFn({ data: { collectionId, videoId } }),
    onSuccess: () => { toast("Added to collection"); onOpenChange(false); },
  });

  const createM = useMutation({
    mutationFn: () => createFn({ data: { title } }),
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ["my-collections"] });
      setTitle(""); setShowNew(false);
      addM.mutate(r.id);
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader><SheetTitle>Save to collection</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-2">
          {(data?.collections ?? []).map((c) => (
            <button key={c.id} onClick={() => addM.mutate(c.id)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left">
              <span className="flex items-center gap-3">
                <Bookmark className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{c.title}</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {c.visibility === "public" ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {c.item_count}
              </span>
            </button>
          ))}
          {!showNew ? (
            <button onClick={() => setShowNew(true)}
              className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground">
              <Plus className="h-4 w-4" /> New collection
            </button>
          ) : (
            <div className="flex gap-2">
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Collection name"
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
              <button onClick={() => createM.mutate()} disabled={!title.trim() || createM.isPending}
                className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                Create
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}