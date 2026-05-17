import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getMyAgreementStatus, acceptAgreement } from "@/lib/verification.functions";
import { Button } from "@/components/ui/button";
import { ScrollText } from "lucide-react";

export function AgreementBanner({ kind }: { kind: "creator" | "business" }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getMyAgreementStatus);
  const acceptFn = useServerFn(acceptAgreement);
  const { data } = useQuery({ queryKey: ["agreement-status"], queryFn: () => getFn() });
  const accept = useMutation({
    mutationFn: () => acceptFn({ data: { kind } }),
    onSuccess: () => {
      toast.success("Agreement accepted");
      qc.invalidateQueries({ queryKey: ["agreement-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (!data) return null;
  const accepted = kind === "creator" ? data.creator_accepted : data.business_accepted;
  if (accepted) return null;

  const href = kind === "creator" ? "/legal/creator-agreement" : "/legal/business-agreement";
  return (
    <div className="mx-4 mt-3 rounded-2xl border border-primary/40 bg-primary/5 p-3 text-sm">
      <div className="flex items-start gap-2">
        <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="font-semibold">Accept the {kind} agreement</p>
          <p className="text-xs text-muted-foreground">
            Please review and accept the latest {kind} terms to keep using payouts, redemptions, and promotions.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link to={href} className="text-xs font-semibold underline">Read agreement</Link>
            <Button size="sm" onClick={() => accept.mutate()} disabled={accept.isPending}>
              {accept.isPending ? "Saving…" : "I agree"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}