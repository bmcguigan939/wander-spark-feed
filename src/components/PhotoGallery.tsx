import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Photo = { id?: string; url: string; caption?: string | null };

/**
 * Shared Booking.com-style photo gallery used on business profile and
 * deal pages. Mobile-first: large hero + horizontal swipe strip; tap to
 * open lightbox. Falls back gracefully when there are 0 / 1 photos.
 */
export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(0)}
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted"
      >
        <img
          src={photos[0].url}
          alt={photos[0].caption ?? ""}
          className="h-full w-full object-cover"
          loading="eager"
        />
        {photos.length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">
            +{photos.length - 1} photos
          </span>
        )}
      </button>
      {photos.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {photos.slice(1, 7).map((p, i) => (
            <button
              key={p.id ?? i}
              type="button"
              onClick={() => setOpen(i + 1)}
              className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted"
            >
              <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {open !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen((i) => (i! - 1 + photos.length) % photos.length); }}
            className="absolute left-2 rounded-full bg-white/10 p-2 text-white"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <img
            src={photos[open].url}
            alt={photos[open].caption ?? ""}
            className="max-h-[85vh] max-w-[92vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen((i) => (i! + 1) % photos.length); }}
            className="absolute right-2 rounded-full bg-white/10 p-2 text-white"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          {photos[open].caption && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[90vw] rounded-full bg-black/70 px-3 py-1 text-xs text-white">
              {photos[open].caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
}