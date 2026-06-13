import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getMyAgreementStatus, acceptAgreement } from "@/lib/verification.functions";

export function AgreementAcceptBar({ kind }: { kind: "creator" | "business" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const getFn = useServerFn(getMyAgreementStatus);
  const acceptFn = useServerFn(acceptAgreement);

  const { data, isLoading } = useQuery({
    queryKey: ["agreement-status"],
    queryFn: () => getFn(),
    enabled: !!user,
  });

  const accept = useMutation({
    mutationFn: () => acceptFn({ data: { kind } }),
    onSuccess: () => {
      toast.success("Agreement accepted");
      qc.invalidateQueries({ queryKey: ["agreement-status"] });
      qc.invalidateQueries({ queryKey: ["bookable-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to accept"),
  });

  const backHref = kind === "business" ? "/business" : "/studio";

  if (!user) {
    return (
      <div className="sticky bottom-0 z-30 border-t border-border/60 bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">Sign in to accept this agreement.</p>
          <Link to="/login" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const accepted = !!data && (kind === "creator" ? data.creator_accepted : data.business_accepted);

  return (
    <div className="sticky bottom-0 z-30 border-t border-border/60 bg-background/95 px-5 py-4 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          {accepted ? (
            <>
              <Check className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Accepted
              </span>
              <span className="text-muted-foreground">— this step is complete.</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                Read through, then tap accept to confirm the {kind} terms.
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={backHref}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground/80 hover:bg-muted/40"
          >
            Back to dashboard
          </Link>
          {accepted ? (
            <Button size="sm" disabled className="rounded-full">
              <Check className="mr-1 h-4 w-4" /> Already accepted
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => accept.mutate()}
              disabled={isLoading || accept.isPending}
              className="rounded-full"
            >
              {accept.isPending ? "Saving…" : "I agree & accept"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}