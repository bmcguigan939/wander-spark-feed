import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function gatewayHeaders(extra: Record<string, string> = {}) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gmKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !gmKey) {
    throw new Error("Google Maps connector is not configured");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gmKey,
    "Content-Type": "application/json",
    ...extra,
  };
}

// ---------- Autocomplete ----------
const autocompleteInput = z.object({
  input: z.string().trim().min(1).max(120),
  sessionToken: z.string().trim().min(8).max(64),
});

export type PlaceSuggestion = {
  placeId: string;
  primary: string;
  secondary: string;
  fullText: string;
};

export const placesAutocomplete = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => autocompleteInput.parse(i))
  .handler(async ({ data }): Promise<{ suggestions: PlaceSuggestion[] }> => {
    const res = await fetch(`${GATEWAY}/places/v1/places:autocomplete`, {
      method: "POST",
      headers: gatewayHeaders(),
      body: JSON.stringify({
        input: data.input,
        sessionToken: data.sessionToken,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Places autocomplete failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const json: any = await res.json();
    const suggestions: PlaceSuggestion[] = (json.suggestions ?? [])
      .map((s: any) => s.placePrediction)
      .filter(Boolean)
      .map((p: any) => ({
        placeId: p.placeId,
        primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
        secondary: p.structuredFormat?.secondaryText?.text ?? "",
        fullText: p.text?.text ?? "",
      }));
    return { suggestions };
  });

// ---------- Place Details ----------
const detailsInput = z.object({
  placeId: z.string().trim().min(1).max(300),
  sessionToken: z.string().trim().min(8).max(64).optional(),
});

export type PlaceDetails = {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  components: {
    line1: string | null;
    city: string | null;
    region: string | null;
    postcode: string | null;
    country: string | null;
  };
};

function pickComponent(comps: any[], types: string[]): string | null {
  for (const t of types) {
    const m = comps.find((c) => Array.isArray(c.types) && c.types.includes(t));
    if (m) return m.longText ?? m.shortText ?? null;
  }
  return null;
}

export const placeDetails = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => detailsInput.parse(i))
  .handler(async ({ data }): Promise<PlaceDetails> => {
    const url = new URL(`${GATEWAY}/places/v1/places/${encodeURIComponent(data.placeId)}`);
    if (data.sessionToken) url.searchParams.set("sessionToken", data.sessionToken);
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: gatewayHeaders({
        "X-Goog-FieldMask":
          "id,formattedAddress,location,addressComponents,displayName",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Place details failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const p: any = await res.json();
    const comps = (p.addressComponents ?? []) as any[];
    const streetNumber = pickComponent(comps, ["street_number"]);
    const route = pickComponent(comps, ["route"]);
    const line1 =
      [streetNumber, route].filter(Boolean).join(" ").trim() ||
      pickComponent(comps, ["premise", "subpremise"]) ||
      null;
    return {
      placeId: p.id ?? data.placeId,
      formattedAddress: p.formattedAddress ?? "",
      lat: p.location?.latitude ?? 0,
      lng: p.location?.longitude ?? 0,
      components: {
        line1,
        city:
          pickComponent(comps, ["postal_town", "locality", "sublocality"]) ?? null,
        region: pickComponent(comps, [
          "administrative_area_level_1",
          "administrative_area_level_2",
        ]),
        postcode: pickComponent(comps, ["postal_code"]),
        country: pickComponent(comps, ["country"]),
      },
    };
  });

// ---------- Geocode a typed address (manual entry) ----------
const geocodeInput = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(120),
  postcode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(80),
});

export type GeocodeAddressResult = {
  formattedAddress: string;
  lat: number;
  lng: number;
} | null;

export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => geocodeInput.parse(i))
  .handler(async ({ data }): Promise<GeocodeAddressResult> => {
    const textQuery = [data.line1, data.line2, data.city, data.postcode, data.country]
      .filter(Boolean)
      .join(", ");
    const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
      method: "POST",
      headers: gatewayHeaders({
        "X-Goog-FieldMask": "places.formattedAddress,places.location",
      }),
      body: JSON.stringify({ textQuery, pageSize: 1 }),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const p = (json.places ?? [])[0];
    if (!p?.location) return null;
    return {
      formattedAddress: p.formattedAddress ?? textQuery,
      lat: p.location.latitude,
      lng: p.location.longitude,
    };
  });