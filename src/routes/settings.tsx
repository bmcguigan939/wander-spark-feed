import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, LogOut, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { exportMyData, deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Account settings — Travidz" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const exportFn = useServerFn(exportMyData);
  const deleteFn = useServerFn(deleteMyAccount);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState("");

  async function onExport() {
    setExporting(true);
    try {
      const { json } = await exportFn({ data: undefined as any });
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `travidz-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function onDelete() {
    if (confirm !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteFn({ data: { confirm } });
      await supabase.auth.signOut();
      toast.success("Your account has been deleted");
      navigate({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message);
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="ml-auto font-display text-lg font-semibold">Settings</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-8 px-5 py-8">
        <section>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Account</h2>
          <div className="mt-3 rounded-2xl border border-border/40 bg-card/40 p-5">
            <div className="text-sm text-muted-foreground">Signed in as</div>
            <div className="font-medium">{user?.email}</div>
            <button
              onClick={() => signOut().then(() => navigate({ to: "/" }))}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </section>

        <section>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your data</h2>
          <div className="mt-3 rounded-2xl border border-border/40 bg-card/40 p-5">
            <p className="text-sm text-muted-foreground">
              Download everything we have associated with your account as a single JSON file.
            </p>
            <button
              onClick={onExport}
              disabled={exporting}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> {exporting ? "Preparing…" : "Download my data"}
            </button>
          </div>
        </section>

        <section>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-destructive">Danger zone</h2>
          <div className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
            <p className="text-sm text-foreground/90">
              Permanently delete your Travidz account and all associated content. This cannot be undone.
            </p>
            <label className="mt-4 block text-xs text-muted-foreground">
              Type <span className="font-mono font-semibold text-destructive">DELETE</span> to confirm
            </label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-destructive"
              placeholder="DELETE"
            />
            <button
              onClick={onDelete}
              disabled={deleting || confirm !== "DELETE"}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete my account"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
