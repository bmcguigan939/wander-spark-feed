import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Video, Tag, Store, Loader2 } from "lucide-react";
import { getClusterDetail } from "@/lib/map.functions";

export type ClusterIds = {
  deal_ids: string[];
  video_ids: string[];
  business_ids: string[];
};

export function ClusteredSheet({
  open,
  onClose,
  ids,
  title,
}: {
  open: boolean;
  onClose: () => void;
  ids: ClusterIds;
  title: string;
}) {
  const fn = useServerFn(getClusterDetail);
  const total = ids.deal_ids.length + ids.video_ids.length + ids.business_ids.length;
  const { data, isLoading } = useQuery({
    queryKey: ["cluster", ids],
    queryFn: () => fn({ data: { ids } }),
    enabled: open && total > 0,
    staleTime: 30_000,
  });

  const initial =
    (data?.deals?.length ?? 0) > 0
      ? "deals"
      : (data?.videos?.length ?? 0) > 0
      ? "videos"
      : "about";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="text-left">{title}</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!isLoading && data && (
          <Tabs defaultValue={initial} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="deals">
                <Tag className="mr-1 h-3.5 w-3.5" /> Deals ({data.deals.length})
              </TabsTrigger>
              <TabsTrigger value="videos">
                <Video className="mr-1 h-3.5 w-3.5" /> Videos ({data.videos.length})
              </TabsTrigger>
              <TabsTrigger value="about">
                <Store className="mr-1 h-3.5 w-3.5" /> About ({data.businesses.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deals" className="mt-3 space-y-2">
              {data.deals.length === 0 && <Empty label="No deals here yet." />}
              {data.deals.map((d: any) => (
                <Link
                  key={d.id}
                  to="/deals/$id"
                  params={{ id: d.id }}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:bg-muted"
                >
                  {d.image_url ? (
                    <img src={d.image_url} alt="" className="h-16 w-16 flex-shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                      <Tag className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{d.title}</p>
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">{d.description}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {d.discount_label && (
                        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                          {d.discount_label}
                        </span>
                      )}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                        {d.category}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </TabsContent>

            <TabsContent value="videos" className="mt-3 grid grid-cols-3 gap-2">
              {data.videos.length === 0 && (
                <div className="col-span-3">
                  <Empty label="No creator videos here yet." />
                </div>
              )}
              {data.videos.map((v: any) => (
                <Link
                  key={v.id}
                  to="/feed/playlist"
                  search={{
                    ids: data.videos.map((x: any) => x.id),
                    start: v.id,
                  } as any}
                  onClick={onClose}
                  className="group relative aspect-[9/14] overflow-hidden rounded-lg bg-muted"
                >
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="line-clamp-2 text-[10px] font-semibold text-white">{v.title}</p>
                    {v.creator?.username && (
                      <p className="text-[9px] text-white/80">@{v.creator.username}</p>
                    )}
                  </div>
                </Link>
              ))}
            </TabsContent>

            <TabsContent value="about" className="mt-3 space-y-2">
              {data.businesses.length === 0 && <Empty label="No business profile listed here." />}
              {data.businesses.map((b: any) => (
                <Link
                  key={b.id}
                  to="/u/$username"
                  params={{ username: b.username ?? b.id }}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:bg-muted"
                >
                  {b.avatar_url ? (
                    <img src={b.avatar_url} alt="" className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                      <Store className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{b.display_name ?? b.username}</p>
                    {b.place_name && (
                      <p className="truncate text-[11px] text-muted-foreground">{b.place_name}</p>
                    )}
                    {b.bio && <p className="line-clamp-1 text-[11px] text-muted-foreground">{b.bio}</p>}
                  </div>
                </Link>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}
