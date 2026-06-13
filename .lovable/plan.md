## Goal

Today the wizard's room/unit step (Step 12) only shows the `RoomsAndRatesEditor` (with its existing room-level photo uploader) when the host's property kind is `hotel`. Apartment, villa, B&B, and other non-hotel hosts see only a "Quick layout" placeholder telling them to finish details from the dashboard — so they can't upload unit photos during setup.

We'll extend the non-hotel path so hosts can upload photos for their unit right in the wizard, matching the hotel flow.

## Changes

1. **`src/routes/business.setup.tsx` — Step 12 (`Step12RoomsRates`)**
   - Replace the non-hotel placeholder card with an inline per-unit photo uploader for the draft `dealId`.
   - Keep the existing "Edit full details" deep-link below the uploader so hosts can still jump into the full editor for beds/amenities/etc.
   - Hotel path remains unchanged (still shows full `RoomsAndRatesEditor`, which already supports room photos + rate plans).
   - Update the step subtitle for non-hotel hosts to mention photos: e.g. "Add a few photos of your unit and the basics. You can refine details from your dashboard."

2. **Photo uploader for a single unit (non-hotel)**
   - Reuse the existing pattern from `RoomsAndRatesEditor` (Supabase `business-photos` bucket upload + `deal_rooms.photos` array), but for a single auto-created "Unit" room row on the draft deal.
   - On step open, ensure a single `deal_rooms` row exists for this draft (create one named after the deal title / "Main unit" if missing) so the photos array has somewhere to live. This row is invisible UI-wise; only its `photos` field is exposed.
   - Cap: 20 photos (same as hotel rooms), show count, allow remove, drag-free simple grid (mirroring current UX).

3. **No schema or RLS changes**
   - `deal_rooms.photos` (text[]) already exists and is covered by existing owner-write policies.
   - `business-photos` storage bucket and its policies are already in use by the hotel flow.

## Out of scope

- No changes to rate plans (per the user's choice — photos stay at room/unit level, not per rate plan).
- No changes to Step 13 (business-level gallery) — that one is separate and stays.
- Hotel flow is untouched.

## Technical notes

- The auto-create-one-unit helper can live inline in Step 12 using the existing `upsertRoom` server fn from `src/lib/rooms-rates.functions.ts`.
- Photo persistence will reuse `upsertRoom` with `{ patch: { name, photos: next } }`, exactly like `RoomsAndRatesEditor.persist`.
- File upload uses the browser `supabase` client → `business-photos` bucket, same path convention as today (`${userId}/rooms/${dealId}/...`).
