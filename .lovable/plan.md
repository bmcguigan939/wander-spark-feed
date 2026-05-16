# Seed demo content for testing

Populate the empty database with realistic travel content so the feed, deal-attach flow, and booking UI are all testable immediately.

## What gets created

- **8 demo creator profiles** (e.g. @balidreamer, @tokyobytes, @parisinframes) with avatars and bios
- **~30 videos** across popular destinations (Bali, Tokyo, Paris, Rome, Bangkok, NYC, Lisbon, Cape Town, Reykjavik, Dubai), each with:
  - Title, description, destination, country, city, activity tags
  - Public sample MP4 + thumbnail (using free stock travel clips via Mux playback IDs or direct URLs in `embed_mode='link_card'`)
  - Randomised view/like/comment counts so the feed looks alive
  - `status='ready'`, `is_draft=false` so they show in the For You feed
- **~25 deals** (hotels, tours, activities) tagged to those destinations with prices, images, supplier URLs, `status='approved'`, `source='seed'`
- **~50 video↔deal attachments** so each video has 1–3 "Book this trip" cards
- **~150 likes and ~80 comments** spread across videos for realism
- A handful of **follow relationships** between creators

## How it runs

A single SQL insert via the Supabase insert tool — no schema changes, no code edits. All rows tagged with `source='seed'` (deals) or a recognisable prefix on usernames so you can wipe them later with one DELETE.

## Notes

- Creator profiles are seeded directly into `profiles` + `user_roles` with synthetic UUIDs (no `auth.users` rows — they're display-only demo accounts, you won't be able to log in as them, which is the intended behaviour for seed data).
- Videos use `embed_mode='link_card'` with public sample video URLs so they play without needing real Mux uploads.
- After seeding I'll confirm counts and you can refresh the feed to see them.

## Cleanup later

One command will wipe all seeded data:
```sql
DELETE FROM videos WHERE creator_id IN (SELECT id FROM profiles WHERE username LIKE 'demo_%');
DELETE FROM deals WHERE source = 'seed';
DELETE FROM profiles WHERE username LIKE 'demo_%';
```
