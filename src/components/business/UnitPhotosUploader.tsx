import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDealRoomsAndRates, upsertRoom } from "@/lib/rooms-rates.functions";

/**
 * Lightweight, single-unit photo uploader for the setup wizard's
 * apartment/villa/unit path. Auto-ensures one `deal_rooms` row exists for
 * the draft deal and exposes its `photos` array as a simple grid uploader,
 * mirroring the hotel flow's `RoomPhotosUploader` UX (max 20, 8MB each).
 */
export function UnitPhotosUploader({
  dealId,
  defaultName = "Main unit",
}: {
  dealId: string;
  defaultName?: string;
}) {
  const fetchFn = useServerFn(getDealRoomsAndRates);
  const upsert = useServerFn(upsertRoom);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>(defaultName);
  const [photos, setPhotos] = useState<string[]>([]);

  const refresh = async () => {
    const r = await fetchFn({ data: { dealId } });
    const rooms = (r?.rooms as any[]) ?? [];
    if (rooms.length > 0) {
      setRoomId(rooms[0].id);
      setRoomName(rooms[0].name ?? defaultName);
      setPhotos((rooms[0].photos as string[] | null) ?? []);
      return rooms[0].id as string;
    }
    const created = await upsert({
      data: { dealId, patch: { name: defaultName, max_guests: 2 } },
    });
    setRoomId(created.id);
    setRoomName(defaultName);
    setPhotos([]);
    return created.id;
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh()
      .catch((e: any) => {
        if (!cancelled) toast.error(e?.message ?? "Could not load photos");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const persist = async (next: string[]) => {
    if (!roomId) return;
    await upsert({
      data: { id: roomId, dealId, patch: { name: roomName, photos: next } },
    });
    setPhotos(next);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !roomId) return;
    if (photos.length + files.length > 20) {
      toast.error("Max 20 photos");
      return;
    }
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const businessId = auth.user?.id;
      if (!businessId) throw new Error("Not signed in");
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name}: too large (max 8MB)`);
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${businessId}/rooms/${roomId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("business-photos")
          .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
        if (upErr) {
          toast.error(upErr.message);
          continue;
        }
        const { data: pub } = supabase.storage.from("business-photos").getPublicUrl(path);
        uploaded.push(pub.publicUrl);
      }
      if (uploaded.length) {
        await persist([...photos, ...uploaded]);
        toast.success(`${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} added`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeAt = async (idx: number) => {
    const next = photos.filter((_, i) => i !== idx);
    try {
      await persist(next);
      toast.success("Photo removed");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Unit photos ({photos.length}/20)</span>
      </p>
      {photos.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-destructive"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
        {uploading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5" /> Add photos
          </>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading || photos.length >= 20}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Tip: add at least 3 photos showing the space, beds, and bathroom. You can refine details
        (beds, amenities, description) from your dashboard later.
      </p>
    </div>
  );
}