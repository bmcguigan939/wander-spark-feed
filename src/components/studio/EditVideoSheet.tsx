import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { updateVideoMetadata } from "@/lib/studio.functions";

type Initial = {
  title: string;
  description: string | null;
  destination: string | null;
  country: string | null;
  city: string | null;
  activity_tags: string[];
  budget_tag: string | null;
};

type Props = {
  videoId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Initial;
};

const BUDGETS = [
  { v: "none", label: "—" },
  { v: "budget", label: "Budget" },
  { v: "mid", label: "Mid" },
  { v: "luxury", label: "Luxury" },
] as const;

export function EditVideoSheet({ videoId, open, onOpenChange, initial }: Props) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateVideoMetadata);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [budget, setBudget] = useState<string>("none");

  useEffect(() => {
    if (!open) return;
    setTitle(initial.title ?? "");
    setDescription(initial.description ?? "");
    setDestination(initial.destination ?? "");
    setCountry(initial.country ?? "");
    setCity(initial.city ?? "");
    setTagsStr((initial.activity_tags ?? []).join(", "));
    setBudget(initial.budget_tag ?? "none");
  }, [open, initial]);

  const saveM = useMutation({
    mutationFn: () => {
      const tags = tagsStr
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10);
      return updateFn({
        data: {
          videoId,
          title: title.trim(),
          description: description.trim() || null,
          destination: destination.trim() || null,
          country: country.trim() || null,
          city: city.trim() || null,
          activity_tags: tags,
          budget_tag: budget as "budget" | "mid" | "luxury" | "none",
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-insights", videoId] });
      qc.invalidateQueries({ queryKey: ["studio-videos"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast("Saved");
      onOpenChange(false);
    },
    onError: (e: any) => toast(e?.message ?? "Couldn't save"),
  });

  const disabled = !title.trim() || saveM.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>Edit details</SheetTitle>
          <SheetDescription>Update title, description, location, tags and budget.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3 pb-4">
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Country">
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={80}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </Field>
            <Field label="City">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={120}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </Field>
          </div>
          <Field label="Destination">
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              maxLength={160}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Activity tags (comma-separated, max 10)">
            <input
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="beach, surfing, food"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Budget">
            <div className="flex flex-wrap gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b.v}
                  type="button"
                  onClick={() => setBudget(b.v)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    budget === b.v
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </Field>

          <button
            type="button"
            disabled={disabled}
            onClick={() => saveM.mutate()}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
          >
            {saveM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saveM.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}