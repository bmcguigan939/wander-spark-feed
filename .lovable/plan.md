## Change

Remove the top `<AgreementBanner kind="business" />` from `src/routes/business.index.tsx` so the "Accept business agreement" appears only once — inside the Enable bookings checklist below.

Also drop the now-unused `AgreementBanner` import from that file.

No other files affected. `AgreementBanner.tsx` stays in the codebase (still used elsewhere, e.g. studio/creator surfaces).