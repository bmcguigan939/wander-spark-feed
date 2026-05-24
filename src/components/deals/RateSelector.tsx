import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bed, Check, Coffee, CreditCard, MapPin, ShieldCheck } from "lucide-react";
import { getDealRoomsAndRates } from "@/lib/rooms-rates.functions";

const LODGING_CATEGORIES = new Set(["stay"]);

const policyLabel: Record<string, string> = {
  travidz_standard: "Standard cancellation",
  free_cancel_until_start: "Free cancellation",
  custom_24h: "Free cancellation until 24h before",
  custom_7d: "Free cancellation until 7 days before",
  non_refundable: "Non-refundable",
};

const paymentLabel: Record<string, string> = {
  pay_online: "Pay online now",
  pay_at_property: "Pay at the property",
  deposit_online_rest_at_property: "Deposit now, rest at property",
};

export function RateSelector({
  dealId,
  category,
  currency,
  referrerVideoId,
}: {
  dealId: string;
  category?: string;
  currency?: string;
  referrerVideoId?: string;
}) {
  const fetchFn = useServerFn(getDealRoomsAndRates);
  const { data, isLoading } = useQuery({
    queryKey: ["rooms-rates", dealId],
    queryFn: () => fetchFn({ data: { dealId } }),
  });

  if (isLoading) return null;
  const rooms = (data?.rooms as any[]) ?? [];
  const rates = (data?.ratePlans as any[]) ?? [];
  const isLodging = !category || LODGING_CATEGORIES.has(category);
  const fmt = (cents: number) =>
    (cents / 100).toLocaleString("en-GB", { style: "currency", currency: currency || "GBP" });

  if (rates.length === 0) return null;

  if (isLodging && rooms.length > 0) {
    return (
      <div className="mt-6 space-y-4">
        <h2 className="text-base font-semibold">Choose your room</h2>
        {rooms
          .filter((r) => r.is_active)
          .map((room) => {
            const roomRates = rates.filter((rp) => rp.room_id === room.id && rp.is_active);
            if (roomRates.length === 0) return null;
            return (
              <div key={room.id} className="rounded-2xl border border-border bg-card/40 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Bed className="h-4 w-4" /> {room.name}
                </div>
                {room.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{room.description}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>Sleeps {room.max_guests}</span>
                  {room.room_size_sqm && <span>· {room.room_size_sqm} m²</span>}
                  {room.inventory_remaining != null && room.inventory_remaining <= 5 && (
                    <span className="font-semibold text-amber-600">
                      · We have {room.inventory_remaining} left
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {roomRates.map((rp) => (
                    <RateCard
                      key={rp.id}
                      rate={rp}
                      dealId={dealId}
                      roomId={room.id}
                      fmt={fmt}
                      referrerVideoId={referrerVideoId}
                    />
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    );
  }

  // Non-lodging or no rooms — flat list
  return (
    <div className="mt-6 space-y-3">
      <h2 className="text-base font-semibold">Choose your rate</h2>
      {rates
        .filter((rp) => rp.is_active && !rp.room_id)
        .map((rp) => (
          <RateCard key={rp.id} rate={rp} dealId={dealId} fmt={fmt} referrerVideoId={referrerVideoId} />
        ))}
    </div>
  );
}

function RateCard({
  rate,
  dealId,
  roomId,
  fmt,
  referrerVideoId,
}: {
  rate: any;
  dealId: string;
  roomId?: string;
  fmt: (c: number) => string;
  referrerVideoId?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{rate.name}</p>
            {rate.discount_label && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                {rate.discount_label}
              </span>
            )}
          </div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              {policyLabel[rate.cancellation_policy_code] ?? rate.cancellation_policy_code}
            </li>
            <li className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              {paymentLabel[rate.payment_timing] ?? rate.payment_timing}
              {rate.payment_timing === "deposit_online_rest_at_property" && rate.deposit_pct && (
                <span> · {rate.deposit_pct}% deposit</span>
              )}
            </li>
            {rate.breakfast === "included" && (
              <li className="flex items-center gap-1.5">
                <Coffee className="h-3.5 w-3.5" /> Breakfast included
              </li>
            )}
            {(rate.perks ?? []).slice(0, 4).map((p: string) => (
              <li key={p} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" /> {p}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Sleeps up to {rate.guests_included}
            </li>
          </ul>
        </div>
        <div className="text-right">
          {rate.compare_at_price_cents && rate.compare_at_price_cents > rate.price_cents && (
            <p className="text-xs text-muted-foreground line-through">
              {fmt(rate.compare_at_price_cents)}
            </p>
          )}
          <p className="text-base font-bold">{fmt(rate.price_cents)}</p>
          <Link
            to="/book/$dealId"
            params={{ dealId }}
            search={{ v: referrerVideoId, rate: rate.id, room: roomId } as any}
            className="mt-2 inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Select
          </Link>
        </div>
      </div>
    </div>
  );
}