import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getThread, postThreadMessage } from "@/lib/business-threads.functions";
import { useAuth } from "@/lib/auth";
import { MobileShell } from "@/components/layout/BottomNav";
import { ThreadConversation } from "@/components/threads/ThreadConversation";

export const Route = createFileRoute("/business/threads/$id")({
  head: () => ({ meta: [{ title: "Conversation — Business" }] }),
  component: BusinessThreadDetail,
});

function BusinessThreadDetail() {
  const { id } = Route.useParams();
  const { user, loading, isBusiness } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getThread);
  const postFn = useServerFn(postThreadMessage);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    else if (!loading && user && !isBusiness) navigate({ to: "/business/apply" });
  }, [loading, user, isBusiness, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["thread", id],
    queryFn: () => getFn({ data: { threadId: id } }),
    enabled: !!user && !!isBusiness,
    refetchInterval: 15_000,
  });

  const sendM = useMutation({
    mutationFn: (body: string) => postFn({ data: { threadId: id, body } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thread", id] }),
    onError: (e: any) => toast.error(e?.message ?? "Couldn't send"),
  });

  return (
    <MobileShell>
      <div className="pb-24">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
          <Link to="/business/threads" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-xs font-semibold">Back to messages</span>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : error || !data ? (
          <div className="px-5 py-10 text-sm text-destructive">Couldn't load this conversation.</div>
        ) : (
          <ThreadConversation
            thread={data.thread as any}
            messages={data.messages}
            creator={data.creator}
            business={data.business}
            viewerKind="business"
            canReply
            isPosting={sendM.isPending}
            onSend={async (b) => { await sendM.mutateAsync(b); }}
          />
        )}
      </div>
    </MobileShell>
  );
}