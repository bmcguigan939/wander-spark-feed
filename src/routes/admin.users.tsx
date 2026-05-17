import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAdminUsers, grantRole, revokeRole } from "@/lib/admin.functions";
import { setProfileVerified } from "@/lib/verification.functions";
import { useAuth } from "@/lib/auth";
import { Plus, X, BadgeCheck, Crown, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

const ROLES = ["creator", "business", "admin"] as const;

function AdminUsers() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const listFn = useServerFn(listAdminUsers);
  const grantFn = useServerFn(grantRole);
  const revokeFn = useServerFn(revokeRole);
  const verifyFn = useServerFn(setProfileVerified);
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => listFn({ data: { q: q || undefined } }),
  });

  const grant = useMutation({
    mutationFn: (v: { userId: string; role: (typeof ROLES)[number] }) => grantFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });
  const revoke = useMutation({
    mutationFn: (v: { userId: string; role: (typeof ROLES)[number] }) => revokeFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });
  const verify = useMutation({
    mutationFn: (v: { userId: string; verified: boolean }) => verifyFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });

  return (
    <div className="px-4 py-4 pb-28 space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username or name…"
        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ul className="space-y-2">
        {data?.users.map((u: any) => (
          <li key={u.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                {u.avatar_url && <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold flex items-center gap-1">
                  {u.display_name ?? u.username}
                  {u.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  {u.is_founding_creator && (
                    <span title={`Founding #${u.founding_creator_number ?? ""}`} className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                      <Crown className="h-3 w-3" />#{u.founding_creator_number ?? "—"}
                    </span>
                  )}
                  {u.power_tier_locked_at && !u.is_founding_creator && (
                    <span title="Power Creator — 50% locked" className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      <Lock className="h-3 w-3" />Power
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  @{u.username}{u.id === me?.id ? " · you" : ""}
                  {u.roles?.includes("creator") && (
                    <> · 12mo GBV {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(((u.rolling_12mo_gbv_cents ?? 0) as number) / 100)}</>
                  )}
                </div>
              </div>
              <button
                onClick={() => verify.mutate({ userId: u.id, verified: !u.is_verified })}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${u.is_verified ? "bg-primary text-primary-foreground" : "border border-dashed border-border text-muted-foreground"}`}
              >
                {u.is_verified ? "Verified" : "Verify"}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ROLES.map((r) => {
                const has = u.roles.includes(r);
                return has ? (
                  <button key={r} onClick={() => revoke.mutate({ userId: u.id, role: r })}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    {r} <X className="h-3 w-3" />
                  </button>
                ) : (
                  <button key={r} onClick={() => grant.mutate({ userId: u.id, role: r })}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    <Plus className="h-3 w-3" /> {r}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
