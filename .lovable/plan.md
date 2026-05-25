
## Restrict storage bucket listing

The scanner flagged two buckets, `avatars` and `deal-images`, as "Public Bucket Allows Listing". Both have a broad `SELECT USING (bucket_id = 'X')` policy on `storage.objects` that lets any client paginate through every file in the bucket via the list API.

These buckets are intentionally **public-read by URL** — avatars and deal images must be fetchable globally — but they should not be **enumerable**. Public buckets serve files via `/storage/v1/object/public/<bucket>/<path>` which bypasses RLS, so dropping the broad SELECT policy preserves all real read access while removing the enumeration vector.

### Verified safe

Code audit: the app only calls `upload()` and `getPublicUrl()` on these buckets (in `src/routes/profile.tsx` and `src/components/business/DealForm.tsx`). No `.list()` calls anywhere. `getPublicUrl()` is a pure URL builder — it doesn't hit RLS.

### Per-bucket disposition

| Bucket | Public? | Current SELECT policy | Action |
| --- | --- | --- | --- |
| `avatars` | yes | `bucket_id = 'avatars'` for all roles | **DROP** the policy. Public CDN URLs still work; listing blocked. |
| `deal-images` | yes | `bucket_id = 'deal-images'` for all roles | **DROP** the policy. Public CDN URLs still work; listing blocked. |
| `price-evidence` | no | already scoped: admin OR `affiliate_links.business_id = auth.uid()` | **No change**. Already correct. |

INSERT / UPDATE / DELETE policies on these buckets remain (owner-scoped via `storage.foldername(name)[1] = auth.uid()::text`) — they're unaffected.

### Migration

```sql
DROP POLICY "avatars public read" ON storage.objects;
DROP POLICY "deal images public read" ON storage.objects;
```

That's the whole change. Single migration, no application-code edits.

### After applying

I'll mark the two `Public Bucket Allows Listing` findings as fixed and update `@security-memory` to record that `avatars` and `deal-images` are public-read-by-URL only, with listing intentionally blocked.

### Note on "only authorized users can read their own media"

The two flagged buckets hold inherently public media (profile photos, deal photos shown on the consumer feed). Restricting reads to the owner would break the feed. The private/owner-scoped bucket (`price-evidence`) is already correctly scoped to the owning business + admins. If you want a separate truly-private media bucket (e.g. uploaded passports, receipts), say the word and I'll add it as a follow-up — it's out of scope here.
