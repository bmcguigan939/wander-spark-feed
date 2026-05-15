import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/layout/BottomNav";

export const Route = createFileRoute("/create")({
  head: () => ({ meta: [{ title: "Travidz — create" }] }),
  component: Page,
});

function Page() {
  return (
    <MobileShell>
      <div className="flex h-dvh flex-col items-center justify-center px-8 text-center">
        <h1 className="text-2xl font-bold capitalize">create</h1>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">
          Coming next. The feed is live — sign in to start saving videos and following creators.
        </p>
        <Link to="/login" className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Sign in
        </Link>
      </div>
    </MobileShell>
  );
}
