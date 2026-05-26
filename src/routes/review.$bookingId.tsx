import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Star, Loader2, Camera } from "lucide-react";
import { MobileShell } from "@/components/layout/BottomNav";
import { getPendingReview, submitReview } from "@/lib/reviews.functions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/review/$bookingId")({
  head: () => ({ meta: [{ title: "Rate your trip — Travidz" }] }),
  component: ReviewPage,
});

const TAGS: Array<{ key: string; label: string }> = [
  { key: "matched_video", label: "As shown in the video" },
  { key: "great_host", label: "Great host" },
  { key: "would_book_again", label: "Would book again" },
  { key: "great_value", label: "Great value" },
  { key: "clean", label: "Clean" },
  { key: "great_location", label: "Great location" },
];

function ReviewPage() {
  const { bookingId } = Route.useParams();
  const navigate = useNavigate();
  const fetchPending = useServerFn(getPendingReview);
  const submit = useServerFn(submitReview);

  const { data, isLoading, error } = useQuery({
    queryKey: ["pending-review", bookingId],
    queryFn: () => fetchPending({ data: { bookingId } }),
    retry: false,
  });

  const existing = (data as any)?.existing;
  const booking = (data as any)?.booking;

  const [rating, setRating] = useState<number>(existing?.rating ?? 0);
  const [step, setStep] = useState<"stars" | "details">(existing ? "details" : "stars");
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [comment, setComment] = useState<string>(existing?.comment ?? "");
  const [matchedVideo, setMatchedVideo] = useState<boolean | undefined>(
    existing?.matched_video ?? undefined,
  );

  const mut = useMutation({
    mutationFn: (r: number) =>
      submit({
        data: {
          bookingId,
          rating: r,
          matchedVideo,
          tags,
          comment: comment.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Thanks — review saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't save review"),
  });

  const onTapStar = (n: number) => {
    setRating(n);
    // Auto-submit on first tap; show details screen for optional extras.
    mut.mutate(n);
    setStep("details");
  };

  const toggleTag = (k: string) => {
    setTags((prev) => (prev.includes(k) ? prev.filter((t) => t !== k) : [...prev, k]));
  };

  const saveDetails = async () => {
    if (!rating) return;
    await mut.mutateAsync(rating);
    navigate({ to: "/review/$bookingId/thanks", params: { bookingId } });
  };

  if (isLoading) {
    return (
      <MobileShell>
        <div className="grid h-[60vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MobileShell>
    );
  }
  if (error || !booking) {
    return (
      <MobileShell>
        <div className="px-4 pt-10 text-center">
          <p className="text-sm text-muted-foreground">
            We can't load this review. {(error as any)?.message ?? ""}
          </p>
          <Link to="/profile" className="mt-4 inline-block text-sm font-medium text-primary underline">
            Back to profile
          </Link>
        </div>
      </MobileShell>
    );
  }

  const businessName =
    booking.business?.business_name ||
    booking.business?.display_name ||
    `@${booking.business?.username ?? "the host"}`;

  return (
    <MobileShell>
      <div className="px-4 pt-8 pb-24">
        {booking.deal?.image_url && (
          <img
            src={booking.deal.image_url}
            alt={booking.deal.title}
            className="aspect-video w-full rounded-2xl object-cover"
          />
        )}
        <h1 className="mt-5 text-xl font-semibold">How was your trip?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {booking.deal?.title} · with {businessName}
        </p>

        {/* Big stars row — tap once, you're done */}
        <div className="mt-6 flex items-center justify-between gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onTapStar(n)}
              className="rounded-full p-1 transition-transform active:scale-90"
              aria-label={`${n} stars`}
            >
              <Star
                className={
                  "h-12 w-12 " +
                  (n <= rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40")
                }
              />
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Tap a star — that's it. The rest is optional.
        </p>

        {step === "details" && rating > 0 && (
          <div className="mt-8 space-y-6">
            {booking.creator_id && (
              <div>
                <p className="text-sm font-medium">Did the trip match the creator's video?</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchedVideo(true)}
                    className={
                      "flex-1 rounded-xl border px-3 py-2 text-sm " +
                      (matchedVideo === true
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground/80")
                    }
                  >
                    Yes, just like the video
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchedVideo(false)}
                    className={
                      "flex-1 rounded-xl border px-3 py-2 text-sm " +
                      (matchedVideo === false
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-border text-foreground/80")
                    }
                  >
                    Not really
                  </button>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium">What stood out?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TAGS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => toggleTag(t.key)}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs " +
                      (tags.includes(t.key)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground/70")
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">Anything to add? (optional)</p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="A short note for other travellers…"
                rows={4}
                maxLength={2000}
                className="mt-2"
              />
              <p className="mt-1 text-right text-[11px] text-muted-foreground">
                {comment.length}/2000
              </p>
            </div>

            <Button
              onClick={saveDetails}
              disabled={mut.isPending || rating === 0}
              className="w-full"
            >
              {mut.isPending ? "Saving…" : "Done"}
            </Button>
            <button
              type="button"
              onClick={() => navigate({ to: "/review/$bookingId/thanks", params: { bookingId } })}
              className="block w-full text-center text-xs text-muted-foreground underline"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

// Silence unused-import warning until photo upload is wired in v2.
void Camera;