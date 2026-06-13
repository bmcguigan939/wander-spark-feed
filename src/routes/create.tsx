import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useRef } from "react";
import { MobileShell } from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/auth";
import { becomeCreator, createDirectUpload, finalizeVideoMetadata } from "@/lib/mux.functions";
import { previewExternalVideo, importExternalVideo, type PreviewResult } from "@/lib/social.functions";
import { toast } from "sonner";
import { Upload, Video, Loader2, Sparkles, MapPin, Music, X, Link2, Youtube, Globe, Instagram, Twitter, Facebook } from "lucide-react";
import { EmojiPicker, insertAtCursor } from "@/components/ui/emoji-picker";
import { MusicPickerSheet } from "@/components/create/MusicPickerSheet";
import type { MusicTrack } from "@/lib/music.functions";
import { SmartDealsSheet } from "@/components/create/SmartDealsSheet";
import { TagBusinessSheet } from "@/components/studio/TagBusinessSheet";
import { CROSS_LINK_PLATFORMS, type CrossLinkPlatform, type CrossLink } from "@/lib/cross-links.functions";
import { ShareToSocialsCard } from "@/components/create/ShareToSocialsCard";
import { LocationPickerSheet } from "@/components/create/LocationPickerSheet";

export const Route = createFileRoute("/create")({
  head: () => ({ meta: [{ title: "Upload — Travidz" }] }),
  component: CreatePage,
});

const BUDGETS = ["budget", "mid", "luxury"] as const;
const inputCls = "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary";

function CreatePage() {
  const { user, loading, isCreator, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const becomeFn = useServerFn(becomeCreator);
  const becomeM = useMutation({ mutationFn: () => becomeFn({ data: undefined as any }), onSuccess: () => refreshRoles() });

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);
  if (loading || !user) return <MobileShell><div className="px-5 pt-10 text-sm text-muted-foreground">Loading…</div></MobileShell>;

  if (!isCreator) {
    return (
      <MobileShell>
        <div className="flex h-dvh flex-col items-center justify-center px-8 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/15 text-primary"><Video className="h-7 w-7" /></div>
          <h1 className="text-2xl font-bold">Become a creator</h1>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">Share your trips with travellers around the world.</p>
          <button onClick={() => becomeM.mutate()} disabled={becomeM.isPending}
            className="mt-8 flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> {becomeM.isPending ? "Activating…" : "Activate creator account"}
          </button>
        </div>
      </MobileShell>
    );
  }
  return <CreateTabs />;
}

function CreateTabs() {
  const [tab, setTab] = useState<"upload" | "import">("upload");
  return (
    <MobileShell>
      <div className="px-5 pb-32 pt-6">
        <h1 className="text-2xl font-bold">Create</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload your video to Travidz so it plays in feed and search — then add links to the same post on your other platforms.</p>
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1">
          {(["upload", "import"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-xl py-2 text-sm font-semibold capitalize transition ${tab === t ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"}`}
            >
              {t === "upload" ? "Upload video" : "Link a post"}
            </button>
          ))}
        </div>
        {tab === "upload" ? <UploadFlowBody /> : <ImportFlow />}
      </div>
    </MobileShell>
  );
}

function UploadFlowBody() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createUploadFn = useServerFn(createDirectUpload);
  const finalizeFn = useServerFn(finalizeVideoMetadata);

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [budget, setBudget] = useState<typeof BUDGETS[number] | "">("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [publishMode, setPublishMode] = useState<"now" | "draft" | "schedule">("now");
  const [scheduleAt, setScheduleAt] = useState("");
  const [track, setTrack] = useState<MusicTrack | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [smartDealsOpen, setSmartDealsOpen] = useState(false);
  const [smartDealsVideoId, setSmartDealsVideoId] = useState<string | null>(null);
  const [publishedVideoId, setPublishedVideoId] = useState<string | null>(null);
  const [publishedTitle, setPublishedTitle] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [crossLinks, setCrossLinks] = useState<Record<CrossLinkPlatform, string>>({
    instagram: "", tiktok: "", facebook: "", youtube: "", x: "",
  });
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  async function startUpload(f: File) {
    setFile(f); setUploading(true); setProgress(0); setUploadError(null);
    try {
      const res = await createUploadFn({ data: { title: f.name.replace(/\.[^.]+$/, "") } });
      setVideoId(res.videoId);
      if (!res.uploadUrl) throw new Error("Upload URL not available");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", res.uploadUrl!);
        xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(f);
      });
      setTitle(f.name.replace(/\.[^.]+$/, ""));
      toast("Upload complete — add details");
    } catch (e: any) {
      const msg = e?.message ?? "Upload failed";
      setUploadError(msg);
      toast(msg);
      setFile(null); setVideoId(null);
    } finally { setUploading(false); }
  }

  const finalizeM = useMutation({
    mutationFn: () => finalizeFn({ data: {
      videoId: videoId!, title,
      description: description || undefined, destination: destination || undefined,
      country: country || undefined, city: city || undefined,
      activity_tags: tagsInput.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      budget_tag: budget || undefined,
      lat: lat === "" ? undefined : Number(lat),
      lng: lng === "" ? undefined : Number(lng),
      publish_mode: publishMode,
      scheduled_at: publishMode === "schedule" && scheduleAt ? new Date(scheduleAt).toISOString() : null,
      music_track_id: track?.id ?? null,
      cross_links: CROSS_LINK_PLATFORMS
        .map((p): CrossLink | null => {
          const raw = crossLinks[p]?.trim();
          if (!raw) return null;
          try { new URL(raw); } catch { return null; }
          return { platform: p, url: raw };
        })
        .filter((x): x is CrossLink => x !== null),
    } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["studio-videos"] });
      qc.invalidateQueries({ queryKey: ["studio-overview"] });
      toast(
        publishMode === "now" ? "Published — processing in the background" :
        publishMode === "draft" ? "Saved as draft" : "Scheduled"
      );
      // Draft → straight to studio. Otherwise show the share-to-socials step.
      if (publishMode === "draft") {
        navigate({ to: "/studio/videos", search: { filter: "all" } });
        return;
      }
      if (videoId) {
        setPublishedTitle(title);
        setPublishedVideoId(videoId);
      }
    },
    onError: (e: any) => toast(e.message ?? "Failed to save"),
  });

  return (
    <div className="mt-6">
        {publishedVideoId && (
          <ShareToSocialsCard
            videoId={publishedVideoId}
            title={publishedTitle}
            onOpenSmartDeals={(country || city || destination)
              ? () => { setSmartDealsVideoId(publishedVideoId); setSmartDealsOpen(true); }
              : undefined}
            onDone={() => navigate({ to: "/studio/videos", search: { filter: "all" } })}
          />
        )}
        {publishedVideoId && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="mt-3 flex w-full items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left transition hover:border-primary"
          >
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Did you feature a business?</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                Invite them to advertise their direct site on Travidz — we'll auto-draft the outreach email using your follower count and this video's stats.
              </span>
            </span>
          </button>
        )}
        {publishedVideoId && (
          <TagBusinessSheet
            videoId={publishedVideoId}
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            initial={{ city: city || undefined }}
          />
        )}
        {uploadError && !uploading && (
          <div className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <div className="font-semibold">Upload failed</div>
            <div className="mt-1 break-words text-xs opacity-90">{uploadError}</div>
          </div>
        )}
        {!file && !publishedVideoId && (
          <label className="mt-6 flex h-64 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card text-center">
            <Upload className="mb-3 h-8 w-8 text-primary" />
            <span className="text-sm font-semibold">Choose a video</span>
            <span className="mt-1 text-xs text-muted-foreground">MP4, MOV up to 2 GB</span>
            <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) startUpload(f); }} />
          </label>
        )}

        {file && uploading && !publishedVideoId && (
          <div className="mt-6 rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-primary" /><span className="text-sm font-medium">Uploading {file.name}</span></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
            <p className="mt-2 text-right text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {file && !uploading && videoId && !publishedVideoId && (
          <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) finalizeM.mutate(); }} className="mt-6 space-y-3">
            <Field label="Title">
              <div className="relative">
                <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} className={`${inputCls} pr-10`} />
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <EmojiPicker onPick={(emoji) => {
                    const { next, caret } = insertAtCursor(titleRef.current, title, emoji);
                    setTitle(next);
                    requestAnimationFrame(() => { const el = titleRef.current; if (el) { el.focus(); el.setSelectionRange(caret, caret); } });
                  }} />
                </div>
              </div>
            </Field>
            <Field label="Description">
              <div className="relative">
                <textarea ref={descRef} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} className={`${inputCls} pr-10`} />
                <div className="absolute right-1 top-1">
                  <EmojiPicker onPick={(emoji) => {
                    const { next, caret } = insertAtCursor(descRef.current, description, emoji);
                    setDescription(next);
                    requestAnimationFrame(() => { const el = descRef.current; if (el) { el.focus(); el.setSelectionRange(caret, caret); } });
                  }} />
                </div>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Country"><input value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} /></Field>
              <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} /></Field>
            </div>
            <Field label="Destination / place"><input value={destination} onChange={(e) => setDestination(e.target.value)} className={inputCls} /></Field>
            <Field label="Activity tags (comma separated)"><input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="beach, hiking, food" className={inputCls} /></Field>
            <Field label="Map location (optional)">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
              >
                <MapPin className="h-4 w-4" />
                {lat && lng ? "Edit pin on map" : "Pick on map"}
              </button>
              {lat && lng && (
                <p className="mb-2 text-xs text-primary">
                  ✓ Pinned at {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                </p>
              )}
              <details className="rounded-xl border border-border bg-card/40 px-3 py-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  Or paste coordinates
                </summary>
                <div className="mt-2">
                  <CoordsInput lat={lat} lng={lng} setLat={setLat} setLng={setLng} inputCls={inputCls} />
                </div>
              </details>
            </Field>
            <Field label="Budget">
              <div className="flex gap-2">
                {BUDGETS.map((b) => (
                  <button type="button" key={b} onClick={() => setBudget(budget === b ? "" : b)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm capitalize ${budget === b ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}>{b}</button>
                ))}
              </div>
            </Field>
            <Field label="Music">
              {track ? (
                <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5">
                  <Music className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{track.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{track.artist}</div>
                  </div>
                  <button type="button" onClick={() => setMusicOpen(true)} className="text-xs font-semibold text-primary">Change</button>
                  <button type="button" onClick={() => setTrack(null)} aria-label="Remove" className="rounded-full p-1 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setMusicOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-3 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary">
                  <Music className="h-4 w-4" /> Add music
                </button>
              )}
            </Field>
            <Field label="When to post">
              <div className="grid grid-cols-3 gap-2">
                {(["now", "draft", "schedule"] as const).map((m) => (
                  <button type="button" key={m} onClick={() => setPublishMode(m)}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold capitalize ${publishMode === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground/80"}`}>
                    {m === "now" ? "Publish now" : m === "draft" ? "Save draft" : "Schedule"}
                  </button>
                ))}
              </div>
              {publishMode === "schedule" && (
                <input
                  type="datetime-local"
                  required
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className={`mt-2 ${inputCls}`}
                />
              )}
            </Field>
            <Field label="Links to this video on other platforms (optional)">
              <div className="space-y-2">
                {CROSS_LINK_PLATFORMS.map((p) => {
                  const Icon = p === "instagram" ? Instagram
                    : p === "tiktok" ? Link2
                    : p === "facebook" ? Facebook
                    : p === "youtube" ? Youtube
                    : Twitter;
                  const label = p === "x" ? "X (Twitter)" : p.charAt(0).toUpperCase() + p.slice(1);
                  return (
                    <div key={p} className="flex items-center gap-2">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <input
                        value={crossLinks[p]}
                        onChange={(e) => setCrossLinks((cl) => ({ ...cl, [p]: e.target.value }))}
                        placeholder={`Paste ${label} URL`}
                        className={inputCls}
                      />
                    </div>
                  );
                })}
                <p className="text-[11px] text-muted-foreground">
                  Viewers see a small chip and can open the same video on your social profile. Travidz still plays the upload natively.
                </p>
              </div>
            </Field>
            <button
              disabled={finalizeM.isPending || !title.trim() || (publishMode === "schedule" && !scheduleAt)}
              className="mt-2 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
            >
              {finalizeM.isPending ? "Saving…" :
                publishMode === "now" ? "Publish" :
                publishMode === "draft" ? "Save draft" : "Schedule"}
            </button>
          </form>
        )}
        <MusicPickerSheet
          open={musicOpen}
          onOpenChange={setMusicOpen}
          selectedId={track?.id ?? null}
          onSelect={(t) => { setTrack(t); setMusicOpen(false); }}
        />
        <SmartDealsSheet
          open={smartDealsOpen}
          videoId={smartDealsVideoId}
          onClose={() => {
            setSmartDealsOpen(false);
            if (!publishedVideoId) {
              navigate({ to: "/studio/videos", search: { filter: "all" } });
            }
          }}
        />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>);
}

// ---------- Coords paste input ----------
function parseCoords(raw: string): { lat: number; lng: number } | null {
  if (!raw) return null;
  const s = raw.trim();
  // Google Maps URL with @lat,lng,zoom
  const at = s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (at) {
    const lat = parseFloat(at[1]); const lng = parseFloat(at[2]);
    if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  // ?q=lat,lng or &query=lat,lng
  const q = s.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (q) {
    const lat = parseFloat(q[1]); const lng = parseFloat(q[2]);
    if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  // "lat[NS], lng[EW]" or "lat lng" with optional ° symbols/parens
  const cleaned = s.replace(/[()°]/g, " ").trim();
  const m = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*([NS])?[,\s]+(-?\d+(?:\.\d+)?)\s*([EW])?$/i);
  if (m) {
    let lat = parseFloat(m[1]); let lng = parseFloat(m[3]);
    if (m[2] && m[2].toUpperCase() === "S") lat = -Math.abs(lat);
    if (m[2] && m[2].toUpperCase() === "N") lat = Math.abs(lat);
    if (m[4] && m[4].toUpperCase() === "W") lng = -Math.abs(lng);
    if (m[4] && m[4].toUpperCase() === "E") lng = Math.abs(lng);
    if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  return null;
}

function CoordsInput({ lat, lng, setLat, setLng, inputCls }: { lat: string; lng: string; setLat: (v: string) => void; setLng: (v: string) => void; inputCls: string }) {
  const [raw, setRaw] = useState<string>(lat && lng ? `${lat}, ${lng}` : "");
  const parsed = parseCoords(raw);
  useEffect(() => {
    if (!raw.trim()) { setLat(""); setLng(""); return; }
    if (parsed) { setLat(parsed.lat.toFixed(6)); setLng(parsed.lng.toFixed(6)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);
  return (
    <>
      <input
        type="text"
        inputMode="text"
        placeholder="Paste from Google Maps (e.g. 50.7236, -2.9326)"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        className={inputCls}
      />
      {raw.trim() && (
        parsed ? (
          <p className="mt-1 text-xs text-primary">✓ {parsed.lat.toFixed(6)}, {parsed.lng.toFixed(6)}</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Couldn't read coordinates — paste like "50.7236, -2.9326"</p>
        )
      )}
      <button
        type="button"
        onClick={() => {
          if (!navigator.geolocation) return toast("Geolocation not available");
          navigator.geolocation.getCurrentPosition(
            (pos) => setRaw(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`),
            (err) => toast(err.message),
            { enableHighAccuracy: true, timeout: 8000 },
          );
        }}
        className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary"
      >
        <MapPin className="h-3 w-3" /> Use my location
      </button>
    </>
  );
}

// ---------- Import from socials ----------

const PLATFORM_META: Record<string, { label: string; hint: string; placeholder: string; Icon: typeof Link2 }> = {
  youtube: { label: "YouTube", hint: "youtube.com/watch?v=…  or  /shorts/…", placeholder: "https://youtube.com/shorts/…", Icon: Youtube },
  tiktok: { label: "TikTok", hint: "tiktok.com/@user/video/…", placeholder: "https://tiktok.com/@user/video/…", Icon: Link2 },
  instagram: { label: "Instagram", hint: "instagram.com/reel/…  or  /p/…", placeholder: "https://instagram.com/reel/…", Icon: Instagram },
  facebook: { label: "Facebook", hint: "facebook.com/…/videos/…  or  fb.watch/…", placeholder: "https://facebook.com/…/videos/…", Icon: Link2 },
  x: { label: "X (Twitter)", hint: "x.com/user/status/…", placeholder: "https://x.com/user/status/…", Icon: Twitter },
};

function ImportFlow() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const previewFn = useServerFn(previewExternalVideo);
  const importFn = useServerFn(importExternalVideo);

  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [customThumb, setCustomThumb] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof PLATFORM_META | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const pasteCardRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [destination, setDestination] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [budget, setBudget] = useState<typeof BUDGETS[number] | "">("");
  const [ownership, setOwnership] = useState(false);

  const previewM = useMutation({
    mutationFn: (u: string) => previewFn({ data: { url: u } }),
    onSuccess: (p) => {
      setPreview(p);
      setTitle(p.title);
      setDescription(p.description ?? "");
    },
    onError: (e: any) => toast(e.message ?? "Couldn't read that link"),
  });

  const importM = useMutation({
    mutationFn: () => importFn({ data: {
      url: preview!.sourceUrl,
      title,
      description: description || undefined,
      thumbnail: (customThumb.trim() || preview!.thumbnail) ?? undefined,
      destination: destination || undefined,
      country: country || undefined,
      city: city || undefined,
      activity_tags: tagsInput.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      budget_tag: budget || undefined,
      ownership_confirmed: ownership,
    } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["studio-videos"] });
      toast("Published to Travidz");
      navigate({ to: "/studio/videos", search: { filter: "all" } });
    },
    onError: (e: any) => toast(e.message ?? "Import failed"),
  });

  return (
    <div className="mt-6 space-y-4">
      {!preview && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {(["youtube", "tiktok", "instagram", "facebook", "x"] as const).map((p) => {
              const M = PLATFORM_META[p];
              const isSelected = selectedPlatform === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(p);
                    requestAnimationFrame(() => {
                      pasteCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      urlInputRef.current?.focus();
                    });
                  }}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left transition active:scale-[0.98] ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <M.Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight">{M.label}</div>
                    <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                      {isSelected ? "selected" : "supported"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div ref={pasteCardRef} className="rounded-3xl border border-border bg-card p-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paste a link</label>
            <div className="mt-2 flex gap-2">
              <input
                ref={urlInputRef}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={selectedPlatform ? PLATFORM_META[selectedPlatform].placeholder : "https://youtube.com/shorts/…"}
                className={inputCls}
              />
              <button
                onClick={() => url.trim() && previewM.mutate(url.trim())}
                disabled={previewM.isPending || !url.trim()}
                className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {previewM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Preview"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              We'll fetch the title, description and thumbnail when the platform allows it. Instagram and Facebook imports appear as linked cards; upload the video file to host and play it natively on Travidz.
            </p>
          </div>
        </>
      )}

      {preview && (
        <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) importM.mutate(); }} className="space-y-3">
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            {preview.thumbnail && (
              <img src={preview.thumbnail} alt="" className="h-44 w-full object-cover" />
            )}
            <div className="flex items-center justify-between gap-2 p-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                {preview.platform === "youtube" ? <Youtube className="h-3.5 w-3.5" /> : <Globe className="h-3 w-3" />}
                {preview.platform}
              </div>
              {preview.authorName && (
                <span className="truncate text-xs text-muted-foreground">by {preview.authorName}</span>
              )}
              <button type="button" onClick={() => { setPreview(null); setUrl(""); }} className="text-xs font-semibold text-muted-foreground">
                Change link
              </button>
            </div>
          </div>

          {!preview.thumbnail && (preview.platform === "instagram" || preview.platform === "facebook") && (
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">
                We couldn't fetch {preview.platform === "instagram" ? "Instagram" : "Facebook"}'s preview image — they often block automated access. Paste a cover image URL below, or use the <b>Upload</b> tab to host the video on Travidz instead.
              </p>
              <input
                value={customThumb}
                onChange={(e) => setCustomThumb(e.target.value)}
                placeholder="https://…/cover.jpg"
                className={`${inputCls} mt-2`}
              />
            </div>
          )}

          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} className={inputCls} />
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country"><input value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} /></Field>
            <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} /></Field>
          </div>
          <Field label="Destination / place"><input value={destination} onChange={(e) => setDestination(e.target.value)} className={inputCls} /></Field>
          <Field label="Activity tags (comma separated)">
            <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="beach, hiking, food" className={inputCls} />
          </Field>
          <Field label="Budget">
            <div className="flex gap-2">
              {BUDGETS.map((b) => (
                <button type="button" key={b} onClick={() => setBudget(budget === b ? "" : b)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm capitalize ${budget === b ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}>{b}</button>
              ))}
            </div>
          </Field>

          <label className="flex items-start gap-2 rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
            <input type="checkbox" checked={ownership} onChange={(e) => setOwnership(e.target.checked)} className="mt-0.5" />
            <span>I own this content or have rights to republish it on Travidz.</span>
          </label>

          <button
            disabled={importM.isPending || !title.trim() || !ownership}
            className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
          >
            {importM.isPending ? "Publishing…" : "Publish linked post"}
          </button>
        </form>
      )}
    </div>
  );
}
