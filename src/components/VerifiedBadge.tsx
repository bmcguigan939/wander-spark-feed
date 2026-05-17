import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center text-primary ${className}`}
      title="Verified by Travidz"
      aria-label="Verified"
    >
      <BadgeCheck className="h-4 w-4" />
    </span>
  );
}