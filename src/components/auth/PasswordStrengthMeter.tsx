import { scorePassword, type StrengthLevel } from "@/lib/password-strength";

const SEGMENT_CLASSES: Record<StrengthLevel, string> = {
  weak: "bg-destructive",
  fair: "bg-amber-500",
  good: "bg-primary",
  strong: "bg-emerald-500",
};

const LABEL_CLASSES: Record<StrengthLevel, string> = {
  weak: "text-destructive",
  fair: "text-amber-600",
  good: "text-primary",
  strong: "text-emerald-600",
};

export function PasswordStrengthMeter({
  password,
  email,
}: {
  password: string;
  email?: string;
}) {
  if (!password) return null;
  const { score, level, label, tip } = scorePassword(password, email);
  const filled = score + 1; // 1..4

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < filled ? SEGMENT_CLASSES[level] : "bg-border"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className={`font-semibold ${LABEL_CLASSES[level]}`}>{label}</span>
        <span className="truncate text-muted-foreground">{tip}</span>
      </div>
    </div>
  );
}