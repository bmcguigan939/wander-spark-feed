import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listAdminUsers, grantRole, revokeRole, setBusinessWebsite,
  blockUser, unblockUser, deleteUserAccount,
  approveFlaggedUser, rejectFlaggedUser, getUserAuditDetail,
} from "@/lib/admin.functions";
import { setProfileVerified } from "@/lib/verification.functions";
import { useAuth } from "@/lib/auth";
import { Plus, X, BadgeCheck, Crown, Lock, ShieldCheck, Ban, Trash2, AlertTriangle, CheckCircle2, History } from "lucide-react";
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
  const setWebsiteFn = useServerFn(setBusinessWebsite);
  const blockFn = useServerFn(blockUser);
  const unblockFn = useServerFn(unblockUser);
  const deleteFn = useServerFn(deleteUserAccount);
  const approveFn = useServerFn(approveFlaggedUser);
  const rejectFn = useServerFn(rejectFlaggedUser);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "trusted" | "untrusted" | "flagged" | "blocked">("all");
  const [auditUserId, setAuditUserId] = useState<string | null>(null);

  const serverFilter = filter === "flagged" || filter === "blocked" ? filter : undefined;
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", q, serverFilter],
    queryFn: () => listFn({ data: { q: q || undefined, filter: serverFilter } }),
  });
  const visibleUsers = (data?.users ?? []).filter((u: any) => {
    if (filter === "all" || filter === "flagged" || filter === "blocked") return true;
    if (filter === "trusted") return !!u.is_verified;
    if (filter === "untrusted") return !u.is_verified;
    return true;
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
  const setWebsite = useMutation({
    mutationFn: (v: { userId: string; businessName: string | null; websiteUrl: string | null }) =>
      setWebsiteFn({ data: v }),
    onSuccess: () => {
      toast("Saved");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });
  const block = useMutation({
    mutationFn: (v: { userId: string; reason: string }) => blockFn({ data: v }),
    onSuccess: () => { toast("User blocked"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });
  const unblock = useMutation({
    mutationFn: (v: { userId: string }) => unblockFn({ data: v }),
    onSuccess: () => { toast("User unblocked"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (v: { userId: string; reason: string }) => deleteFn({ data: { ...v, addToBlocklist: true } }),
    onSuccess: () => { toast("Account deleted"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });
  const approve = useMutation({
    mutationFn: (v: { userId: string }) => approveFn({ data: v }),
    onSuccess: () => { toast("Approved"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });
  const reject = useMutation({
    mutationFn: (v: { userId: string; reason: string }) => rejectFn({ data: v }),
    onSuccess: () => { toast("Rejected & blocked"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast(e?.message ?? "Failed"),
  });

  return (
    <div className="px-4 py-4 pb-28 space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username or name…"
        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
      <div className="flex flex-wrap gap-1.5">
        {(["all", "trusted", "untrusted", "flagged", "blocked"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize ${filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}
          >
            {f}
          </button>
        ))}
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ul className="space-y-2">
        {visibleUsers.map((u: any) => (
          <li key={u.id} className={`rounded-2xl border bg-card p-3 ${u.is_blocked ? "border-destructive/50 opacity-80" : u.pending_admin_review ? "border-amber-500/60" : "border-border"}`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                {u.avatar_url && <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold flex items-center gap-1">
                  {u.display_name ?? u.username}
                  {u.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  {u.is_blocked && <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive"><Ban className="h-3 w-3" />Blocked</span>}
                  {u.pending_admin_review && !u.is_blocked && <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600"><AlertTriangle className="h-3 w-3" />Flagged</span>}
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
                {u.pending_admin_review && u.review_reason && (
                  <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                    Why flagged: {u.review_reason}
                  </div>
                )}
                {u.is_blocked && u.block_reason && (
                  <div className="mt-1 text-[11px] text-destructive">
                    Blocked: {u.block_reason}
                  </div>
                )}
              </div>
              <button
                onClick={() => verify.mutate({ userId: u.id, verified: !u.is_verified })}
                title={u.is_verified ? "Mark as untrusted" : "Mark as trusted"}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${u.is_verified ? "bg-primary text-primary-foreground" : "border border-dashed border-border text-muted-foreground"}`}
              >
                <ShieldCheck className="h-3 w-3" />
                {u.is_verified ? "Trusted" : "Untrust"}
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
            {(u.roles?.includes("business") || u.business_name || u.business_website_url) && (
              <BusinessWebsiteEditor
                userId={u.id}
                initialName={u.business_name ?? ""}
                initialUrl={u.business_website_url ?? ""}
                onSave={(businessName, websiteUrl) =>
                  setWebsite.mutate({ userId: u.id, businessName, websiteUrl })
                }
                saving={setWebsite.isPending && setWebsite.variables?.userId === u.id}
              />
            )}
            {/* Admin actions: block / unblock / delete / approve-reject / history */}
            {u.id !== me?.id && (
              <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
                {u.pending_admin_review && !u.is_blocked && (
                  <>
                    <button
                      onClick={() => approve.mutate({ userId: u.id })}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = window.prompt("Reason for rejecting this flagged signup?");
                        if (reason) reject.mutate({ userId: u.id, reason });
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold text-destructive"
                    >
                      <X className="h-3 w-3" /> Reject
                    </button>
                  </>
                )}
                {!u.is_blocked ? (
                  <button
                    onClick={() => {
                      const reason = window.prompt("Reason for blocking this account?");
                      if (reason) block.mutate({ userId: u.id, reason });
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2.5 py-1 text-[11px] font-semibold text-destructive"
                  >
                    <Ban className="h-3 w-3" /> Block
                  </button>
                ) : (
                  <button
                    onClick={() => unblock.mutate({ userId: u.id })}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Unblock
                  </button>
                )}
                <button
                  onClick={() => {
                    const reason = window.prompt("Permanently delete this account? Type a reason to confirm.");
                    if (reason) del.mutate({ userId: u.id, reason });
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-destructive bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
                <button
                  onClick={() => setAuditUserId(auditUserId === u.id ? null : u.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                >
                  <History className="h-3 w-3" /> History
                </button>
              </div>
            )}
            {auditUserId === u.id && <UserAuditPanel userId={u.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserAuditPanel({ userId }: { userId: string }) {
  const auditFn = useServerFn(getUserAuditDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-audit", userId],
    queryFn: () => auditFn({ data: { userId } }),
  });
  if (isLoading) return <p className="mt-2 text-[11px] text-muted-foreground">Loading history…</p>;
  if (!data) return null;
  return (
    <div className="mt-2 rounded-xl border border-border bg-background p-2 text-[11px] space-y-2">
      <div>
        <div className="font-semibold uppercase tracking-wide text-muted-foreground">Identity</div>
        <div>Email: {data.email ?? "—"}</div>
        <div>Phone: {data.phone ?? "—"}</div>
        <div>Last sign-in: {data.lastSignInAt ? new Date(data.lastSignInAt).toLocaleString() : "—"}</div>
      </div>
      <div>
        <div className="font-semibold uppercase tracking-wide text-muted-foreground">Recent signals</div>
        {data.signals.length === 0 ? <div className="text-muted-foreground">None recorded</div> : data.signals.map((s: any, i: number) => (
          <div key={i}>{s.kind}: {s.raw_value} <span className="text-muted-foreground">· {new Date(s.seen_at).toLocaleDateString()}</span></div>
        ))}
      </div>
      <div>
        <div className="font-semibold uppercase tracking-wide text-muted-foreground">Recent admin actions</div>
        {data.actions.length === 0 ? <div className="text-muted-foreground">None</div> : data.actions.map((a: any, i: number) => (
          <div key={i}>{a.action}{a.notes ? ` — ${a.notes}` : ""} <span className="text-muted-foreground">· {new Date(a.created_at).toLocaleDateString()}</span></div>
        ))}
      </div>
    </div>
  );
}

function BusinessWebsiteEditor({
  userId,
  initialName,
  initialUrl,
  onSave,
  saving,
}: {
  userId: string;
  initialName: string;
  initialUrl: string;
  onSave: (businessName: string | null, websiteUrl: string | null) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState(initialUrl);
  const dirty = name !== initialName || url !== initialUrl;
  return (
    <div className="mt-2 rounded-xl border border-border bg-background p-2 space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Business
      </div>
      <input
        key={`name-${userId}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Business name"
        className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs outline-none focus:border-primary"
      />
      <input
        key={`url-${userId}`}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://booking.example.com"
        className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs outline-none focus:border-primary"
      />
      <div className="flex justify-end">
        <button
          disabled={!dirty || saving}
          onClick={() => onSave(name.trim() || null, url.trim() || null)}
          className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
