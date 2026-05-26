import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Camera, Trash2, Star, StarOff, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listBusinessPhotos,
  addBusinessPhoto,
  updateBusinessPhoto,
  deleteBusinessPhoto,
  PHOTO_CATEGORIES,
} from "@/lib/business-photos.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Photo = {
  id: string;
  business_id: string;
  url: string;
  caption: string | null;
  category: string;
  sort_order: number;
  is_cover: boolean;
};

const STAY_CATS = ["exterior", "lobby", "dining", "pool", "view", "amenity", "other"];
const ACTIVITY_CATS = ["location", "equipment", "group", "highlight", "other"];

export function BusinessPhotosEditor({ businessId, kind = "stay" }: { businessId: string; kind?: "stay" | "activity" }) {
  const qc = useQueryClient();
  const list = useServerFn(listBusinessPhotos);
  const addFn = useServerFn(addBusinessPhoto);
  const updateFn = useServerFn(updateBusinessPhoto);
  const deleteFn = useServerFn(deleteBusinessPhoto);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["business-photos", businessId],
    queryFn: () => list({ data: { businessId } }),
  });
  const photos = (data?.photos as Photo[]) ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["business-photos", businessId] });
  const cats = kind === "activity" ? ACTIVITY_CATS : STAY_CATS;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: not an image`);
          continue;
        }
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name}: must be under 8 MB`);
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("business-photos")
          .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
        if (upErr) {
          toast.error(upErr.message);
          continue;
        }
        const { data: pub } = supabase.storage.from("business-photos").getPublicUrl(path);
        await addFn({
          data: {
            url: pub.publicUrl,
            category: kind === "activity" ? "location" : "exterior",
          },
        });
      }
      invalidate();
      toast.success("Photos uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setCover = useMutation({
    mutationFn: (id: string) => updateFn({ data: { id, patch: { is_cover: true } } }),
    onSuccess: () => {
      toast.success("Cover photo updated");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const setCategory = useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) =>
      updateFn({ data: { id, patch: { category: category as any } } }),
    onSuccess: invalidate,
  });
  const setCaption = useMutation({
    mutationFn: ({ id, caption }: { id: string; caption: string }) =>
      updateFn({ data: { id, patch: { caption } } }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Photo deleted");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <section id="photos" className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          <h2 className="text-base font-semibold">Property photos</h2>
        </div>
        <span className="text-xs text-muted-foreground">{photos.length}/50</span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Add at least 3 photos showing your {kind === "activity" ? "operation" : "property"} so travellers can preview before booking.
        Tap the star to choose your cover photo.
      </p>

      <label className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/40 px-4 py-6 text-sm text-muted-foreground hover:text-foreground">
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> Add photos (JPG/PNG, ≤8 MB each)
          </>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading || photos.length >= 50}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading photos…</p>
      ) : photos.length === 0 ? (
        <p className="text-xs text-muted-foreground">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-background/40">
              <div className="relative aspect-[4/3]">
                <img src={p.url} alt={p.caption ?? ""} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCover.mutate(p.id)}
                  aria-label={p.is_cover ? "Cover photo" : "Make cover"}
                  className="absolute left-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                >
                  {p.is_cover ? (
                    <Star className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300" />
                  ) : (
                    <StarOff className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(p.id)}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-destructive"
                  aria-label="Delete photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-1 p-2">
                <Select value={p.category} onValueChange={(v) => setCategory.mutate({ id: p.id, category: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  defaultValue={p.caption ?? ""}
                  onBlur={(e) => {
                    if (e.currentTarget.value !== (p.caption ?? "")) {
                      setCaption.mutate({ id: p.id, caption: e.currentTarget.value });
                    }
                  }}
                  placeholder="Caption (optional)"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}