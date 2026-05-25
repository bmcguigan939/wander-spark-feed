import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/account/delete")({
  head: () => ({
    meta: [
      { title: "Delete account — Travidz" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteMyAccount);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

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
          <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Settings
          </Link>
          <h1 className="ml-auto font-display text-lg font-semibold">Delete account</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-5 py-8">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
            <div>
              <h2 className="font-display text-lg font-semibold">This cannot be undone</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Deleting your Travidz account is permanent. We cannot restore data once deleted.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-border/40 bg-card/40 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">What gets deleted</h3>
          <ul className="mt-3 space-y-2 text-sm text-foreground/90">
            <li>• Your profile, username, avatar, and bio</li>
            <li>• All videos you've posted and their analytics</li>
            <li>• All comments, likes, saves, and follows</li>
            <li>• Your collections and itineraries</li>
            <li>• Deal applications and creator earnings history</li>
            <li>• Push notification subscriptions across all devices</li>
            <li>• Login credentials — you'll be signed out everywhere</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-border/40 bg-card/40 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Before you delete</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            You can download a copy of everything we have on file first.
          </p>
          <Link
            to="/settings"
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Go to Settings → Your data
          </Link>
        </section>

        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
          <label className="block text-xs text-muted-foreground">
            Type <span className="font-mono font-semibold text-destructive">DELETE</span> to confirm
          </label>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-destructive"
            placeholder="DELETE"
            autoComplete="off"
          />
          <button
            onClick={onDelete}
            disabled={deleting || confirm !== "DELETE"}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Permanently delete my account"}
          </button>
        </section>
      </main>
    </div>
  );
}