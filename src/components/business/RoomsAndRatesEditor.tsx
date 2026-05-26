import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Bed, Tag, Upload, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getDealRoomsAndRates,
  upsertRoom,
  deleteRoom,
  upsertRatePlan,
  deleteRatePlan,
} from "@/lib/rooms-rates.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LODGING_CATEGORIES = new Set(["stay"]);

type Room = {
  id: string;
  deal_id: string;
  name: string;
  description: string | null;
  max_guests: number;
  inventory_total: number | null;
  inventory_remaining: number | null;
  room_size_sqm: number | null;
  is_active: boolean;
  photos?: string[] | null;
};

type RatePlan = {
  id: string;
  deal_id: string;
  room_id: string | null;
  name: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  currency: string;
  cancellation_policy_code: string;
  payment_timing: "pay_online" | "pay_at_property" | "deposit_online_rest_at_property";
  deposit_pct: number | null;
  breakfast: "included" | "available_paid" | "none";
  guests_included: number;
  perks: string[];
  discount_label: string | null;
  is_active: boolean;
};

export function RoomsAndRatesEditor({ dealId, category }: { dealId: string; category?: string }) {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getDealRoomsAndRates);
  const { data, isLoading } = useQuery({
    queryKey: ["rooms-rates", dealId],
    queryFn: () => fetchFn({ data: { dealId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["rooms-rates", dealId] });
  const isLodging = !category || LODGING_CATEGORIES.has(category);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading rooms & rates…</p>;

  const rooms = (data?.rooms as Room[]) ?? [];
  const rates = (data?.ratePlans as RatePlan[]) ?? [];
  const flatRates = rates.filter((r) => !r.room_id);

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h2 className="text-base font-semibold">{isLodging ? "Rooms & rates" : "Rate plans"}</h2>
        <p className="text-xs text-muted-foreground">
          {isLodging
            ? "Add the room types you sell, each with one or more rate options (refundable, non-refundable, breakfast included, etc.)."
            : "Add one or more rate options travellers can pick at checkout."}
        </p>
      </div>

      {isLodging && (
        <>
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              rates={rates.filter((r) => r.room_id === room.id)}
              dealId={dealId}
              onChange={invalidate}
            />
          ))}
          <AddRoomButton dealId={dealId} onAdded={invalidate} />
        </>
      )}

      {!isLodging && (
        <div className="rounded-2xl border border-border bg-card/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Tag className="h-4 w-4" /> Rate plans
          </div>
          {flatRates.map((rp) => (
            <RatePlanRow key={rp.id} rate={rp} dealId={dealId} onChange={invalidate} />
          ))}
          <AddRateButton dealId={dealId} roomId={null} onAdded={invalidate} />
        </div>
      )}
    </div>
  );
}

function AddRoomButton({ dealId, onAdded }: { dealId: string; onAdded: () => void }) {
  const upsert = useServerFn(upsertRoom);
  const mut = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          dealId,
          patch: { name: "New room", max_guests: 2, inventory_total: 1 },
        },
      }),
    onSuccess: () => {
      toast.success("Room added");
      onAdded();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  return (
    <button
      type="button"
      onClick={() => mut.mutate()}
      disabled={mut.isPending}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/20 px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
    >
      <Plus className="h-4 w-4" /> Add a room
    </button>
  );
}

function RoomCard({
  room,
  rates,
  dealId,
  onChange,
}: {
  room: Room;
  rates: RatePlan[];
  dealId: string;
  onChange: () => void;
}) {
  const upsert = useServerFn(upsertRoom);
  const del = useServerFn(deleteRoom);
  const [local, setLocal] = useState({
    name: room.name,
    description: room.description ?? "",
    max_guests: room.max_guests,
    inventory_total: room.inventory_total ?? 1,
    room_size_sqm: room.room_size_sqm ?? "",
  });

  const save = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          id: room.id,
          dealId,
          patch: {
            name: local.name,
            description: local.description || null,
            max_guests: Number(local.max_guests),
            inventory_total: Number(local.inventory_total),
            room_size_sqm: local.room_size_sqm === "" ? null : Number(local.room_size_sqm),
          },
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      onChange();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const remove = useMutation({
    mutationFn: () => del({ data: { id: room.id, dealId } }),
    onSuccess: () => {
      toast.success("Room deleted");
      onChange();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bed className="h-4 w-4" /> {room.name}
        </div>
        <button
          type="button"
          onClick={() => remove.mutate()}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Delete room"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-xs">Room name</Label>
          <Input value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Description</Label>
          <Textarea
            rows={2}
            value={local.description}
            onChange={(e) => setLocal({ ...local, description: e.target.value })}
            placeholder="1 queen bed · 22 m² · city view"
          />
        </div>
        <div>
          <Label className="text-xs">Max guests</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={local.max_guests}
            onChange={(e) => setLocal({ ...local, max_guests: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Rooms available</Label>
          <Input
            type="number"
            min={0}
            value={local.inventory_total}
            onChange={(e) => setLocal({ ...local, inventory_total: Number(e.target.value) })}
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Size (m², optional)</Label>
          <Input
            type="number"
            min={0}
            value={local.room_size_sqm}
            onChange={(e) => setLocal({ ...local, room_size_sqm: e.target.value as any })}
          />
        </div>
      </div>
      <Button size="sm" className="mt-3" onClick={() => save.mutate()} disabled={save.isPending}>
        Save room
      </Button>

      <RoomPhotosUploader room={room} dealId={dealId} onChange={onChange} />

      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Rates for this room
        </p>
        {rates.map((rp) => (
          <RatePlanRow key={rp.id} rate={rp} dealId={dealId} onChange={onChange} />
        ))}
        <AddRateButton dealId={dealId} roomId={room.id} onAdded={onChange} />
      </div>
    </div>
  );
}

function AddRateButton({
  dealId,
  roomId,
  onAdded,
}: {
  dealId: string;
  roomId: string | null;
  onAdded: () => void;
}) {
  const upsert = useServerFn(upsertRatePlan);
  const mut = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          dealId,
          patch: {
            room_id: roomId,
            name: "Standard rate",
            price_cents: 10000,
            currency: "GBP",
            cancellation_policy_code: "travidz_standard",
            payment_timing: "pay_online",
            breakfast: "none",
            guests_included: 1,
          },
        },
      }),
    onSuccess: () => {
      toast.success("Rate added");
      onAdded();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  return (
    <button
      type="button"
      onClick={() => mut.mutate()}
      disabled={mut.isPending}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
    >
      <Plus className="h-3.5 w-3.5" /> Add a rate plan
    </button>
  );
}

function RatePlanRow({ rate, dealId, onChange }: { rate: RatePlan; dealId: string; onChange: () => void }) {
  const upsert = useServerFn(upsertRatePlan);
  const del = useServerFn(deleteRatePlan);
  const [local, setLocal] = useState({
    name: rate.name,
    price: (rate.price_cents / 100).toFixed(2),
    compareAt: rate.compare_at_price_cents ? (rate.compare_at_price_cents / 100).toFixed(2) : "",
    cancellation: rate.cancellation_policy_code,
    payment: rate.payment_timing,
    deposit: rate.deposit_pct ?? 25,
    breakfast: rate.breakfast,
    perks: (rate.perks ?? []).join(", "),
    discountLabel: rate.discount_label ?? "",
  });

  const save = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          id: rate.id,
          dealId,
          patch: {
            room_id: rate.room_id,
            name: local.name,
            price_cents: Math.round(Number(local.price) * 100),
            compare_at_price_cents: local.compareAt ? Math.round(Number(local.compareAt) * 100) : null,
            cancellation_policy_code: local.cancellation as any,
            payment_timing: local.payment as any,
            deposit_pct: local.payment === "deposit_online_rest_at_property" ? Number(local.deposit) : null,
            breakfast: local.breakfast as any,
            perks: local.perks
              ? local.perks
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [],
            discount_label: local.discountLabel || null,
          },
        },
      }),
    onSuccess: () => {
      toast.success("Rate saved");
      onChange();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const remove = useMutation({
    mutationFn: () => del({ data: { id: rate.id, dealId } }),
    onSuccess: () => {
      toast.success("Rate deleted");
      onChange();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="mb-3 rounded-xl border border-border/60 bg-background/50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">{rate.name}</p>
        <button
          type="button"
          onClick={() => remove.mutate()}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Delete rate"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-xs">Rate name</Label>
          <Input
            value={local.name}
            onChange={(e) => setLocal({ ...local, name: e.target.value })}
            placeholder="e.g. Non-refundable, Breakfast included"
          />
        </div>
        <div>
          <Label className="text-xs">Price ({rate.currency})</Label>
          <Input
            type="number"
            step="0.01"
            value={local.price}
            onChange={(e) => setLocal({ ...local, price: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Strike-through (optional)</Label>
          <Input
            type="number"
            step="0.01"
            value={local.compareAt}
            onChange={(e) => setLocal({ ...local, compareAt: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Cancellation</Label>
          <Select value={local.cancellation} onValueChange={(v) => setLocal({ ...local, cancellation: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="travidz_standard">Travidz standard</SelectItem>
              <SelectItem value="free_cancel_until_start">Free until travel date</SelectItem>
              <SelectItem value="custom_24h">Free up to 24h before</SelectItem>
              <SelectItem value="custom_7d">Free up to 7 days before</SelectItem>
              <SelectItem value="non_refundable">Non-refundable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Payment</Label>
          <Select value={local.payment} onValueChange={(v) => setLocal({ ...local, payment: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pay_online">Pay online now</SelectItem>
              <SelectItem value="pay_at_property">Pay at property</SelectItem>
              <SelectItem value="deposit_online_rest_at_property">Deposit now, rest at property</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {local.payment === "deposit_online_rest_at_property" && (
          <div>
            <Label className="text-xs">Deposit %</Label>
            <Input
              type="number"
              min={1}
              max={99}
              value={local.deposit}
              onChange={(e) => setLocal({ ...local, deposit: Number(e.target.value) })}
            />
          </div>
        )}
        <div>
          <Label className="text-xs">Breakfast</Label>
          <Select value={local.breakfast} onValueChange={(v) => setLocal({ ...local, breakfast: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not included</SelectItem>
              <SelectItem value="included">Included</SelectItem>
              <SelectItem value="available_paid">Available for extra fee</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Perks (comma-separated)</Label>
          <Input
            value={local.perks}
            onChange={(e) => setLocal({ ...local, perks: e.target.value })}
            placeholder="Free Wi-Fi, Late checkout, Welcome drink"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Discount badge (optional)</Label>
          <Input
            value={local.discountLabel}
            onChange={(e) => setLocal({ ...local, discountLabel: e.target.value })}
            placeholder="15% OFF"
          />
        </div>
      </div>
      <Button size="sm" className="mt-3" onClick={() => save.mutate()} disabled={save.isPending}>
        Save rate
      </Button>
    </div>
  );
}