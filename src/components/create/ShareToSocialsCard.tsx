import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  Copy,
  ExternalLink,
  Facebook,
  Instagram,
  Link2,
  Share2,
  Sparkles,
  Twitter,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { getMySocials } from "@/lib/social.functions";
import {
  platformOpenUrl,
  platformPrefillsUrl,
  type Platform,
} from "@/lib/social-share";

const PLATFORMS: { key: Platform; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "tiktok", label: "TikTok", Icon: Link2 },
  { key: "youtube", label: "YouTube", Icon: Youtube },
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "x", label: "X", Icon: Twitter },
];

export function ShareToSocialsCard({
  videoId,
  title,
  onOpenSmartDeals,
  onDone,
}: {
  videoId: string;
  title: string;
  onOpenSmartDeals?: () => void;
  onDone: () => void;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/?v=${videoId}`;
  const shareText = title ? `${title} — watch on Travidz` : "Watch on Travidz";

  const getSocialsFn = useServerFn(getMySocials);
  const { data: socials } = useQuery({
    queryKey: ["my-socials"],
    queryFn: () => getSocialsFn({ data: undefined as any }),
  });

  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Copy this link", { description: url, duration: 8000 });
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title, url, text: shareText }); return; } catch { /* user cancelled */ }
    }
    copyLink();
  }

  function openOn(p: Platform) {
    const handles = socials ?? {};
    const target = platformOpenUrl(p, handles as any, url, shareText);
    // Always copy first — even when we prefill via X/Facebook intents, having
    // the URL on the clipboard makes it trivial to re-use in a story etc.
    navigator.clipboard?.writeText?.(url).catch(() => {});
    window.open(target, "_blank", "noopener,noreferrer");
    if (!platformPrefillsUrl(p)) {
      toast("Link copied — paste it into your post");
    }
  }

  const linkedCount = useMemo(() => {
    if (!socials) return 0;
    return PLATFORMS.filter((p) => (socials as any)[`${p.key}_handle`]).length;
  }, [socials]);

  return (
    <div className="mt-6 space-y-5 rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/10 to-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">Published</div>
          <h2 className="font-display text-lg font-semibold leading-none">Send your followers here</h2>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste this link in your Instagram bio, TikTok caption, story or YouTube description.
        Anyone who taps it lands on your Travidz video — with bookings and nearby trips ready to go.
      </p>

      <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open in</span>
          {socials !== undefined && linkedCount === 0 && (
            <a href="/profile" className="text-[11px] font-semibold text-primary underline">
              Add your handles
            </a>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {PLATFORMS.map(({ key, label, Icon }) => {
            const hasHandle = Boolean((socials as any)?.[`${key}_handle`]);
            const prefills = platformPrefillsUrl(key);
            const ready = hasHandle || prefills;
            return (
              <button
                key={key}
                type="button"
                onClick={() => openOn(key)}
                className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-[11px] font-semibold transition ${
                  ready
                    ? "border-border bg-card text-foreground hover:border-primary hover:text-primary"
                    : "border-dashed border-border bg-card/40 text-muted-foreground"
                }`}
                title={prefills ? "Opens a pre-filled post" : hasHandle ? "Opens your profile" : "Opens the platform"}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-border bg-background p-3">
        <div className="flex-shrink-0 rounded-xl bg-white p-2">
          <QRCodeSVG value={url} size={88} bgColor="#ffffff" fgColor="#0f172a" includeMargin={false} />
        </div>
        <div className="min-w-0 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground">Use in stories &amp; print</div>
          Screenshot the QR for your Instagram or TikTok story so viewers can scan to open the video on Travidz.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={nativeShare}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-2.5 text-sm font-semibold hover:border-primary"
        >
          <Share2 className="h-4 w-4" /> Share via…
        </button>
        {onOpenSmartDeals && (
          <button
            type="button"
            onClick={onOpenSmartDeals}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-2.5 text-sm font-semibold hover:border-primary"
          >
            <ExternalLink className="h-4 w-4" /> Attach booking deals
          </button>
        )}
        <button
          type="button"
          onClick={onDone}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Done
        </button>
      </div>
    </div>
  );
}