In `src/routes/business.deals.new.tsx`, darken the amber text in the "bank not connected" banner for better contrast on the cream background:

- Heading (line 60): `text-amber-700` → `text-amber-900` (dark mode `text-amber-400` → `text-amber-300`)
- Body (line 63): `text-amber-700/80` → `text-amber-900/90` (dark `text-amber-300/80` → `text-amber-200/90`)
- "Connect bank" link (line 69): `text-amber-700` → `text-amber-900` (dark `text-amber-400` → `text-amber-300`)
- Info icon (line 58): `text-amber-500` → `text-amber-700` for matching weight

No other changes.