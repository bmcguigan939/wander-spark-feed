import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarClock } from "lucide-react";

function toLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleSheet({
  open,
  onOpenChange,
  currentScheduledAt,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentScheduledAt: string | null;
  onSave: (iso: string | null) => void;
  saving?: boolean;
}) {
  const [value, setValue] = useState<string>("");
  useEffect(() => {
    if (open) setValue(toLocal(currentScheduledAt));
  }, [open, currentScheduledAt]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border/60">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display">
            <CalendarClock className="h-4 w-4 text-primary" /> Schedule post
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Your video will go live automatically at the chosen time.
          </p>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => onSave(null)}
              disabled={saving}
              className="flex-1 rounded-full border border-border bg-card py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Clear schedule
            </button>
            <button
              type="button"
              disabled={!value || saving}
              onClick={() => onSave(new Date(value).toISOString())}
              className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}