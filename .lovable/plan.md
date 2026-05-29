## Goal
Make the "Enable bookings on Travidz" checklist items obviously actionable. Right now the whole row is a tappable `<Link>` with no visual affordance — users don't realise they can click it.

## Change
Single file: `src/components/business/OnboardingChecklist.tsx`.

For each incomplete step, render a small pill-style **Open →** button on the right side of the row. Completed rows show a muted "Done" label (no button) and keep the strikethrough/check styling.

### Row layout (per incomplete step)
```
[○]  Add property photos                       [ Open → ]
     At least 3 photos of your property.
```

### Implementation notes
- Replace the row-level `<Link>` wrapper with a `<div>` containing the icon + text on the left and a `<Link to={s.to}>` styled as a button on the right (`rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20`, with a `ChevronRight` icon).
- Keep the whole row tappable as a secondary affordance: wrap the left-side content in its own `<Link>` so mobile users can still tap anywhere, but the explicit button is the primary CTA.
- Completed rows: no button, show small muted "Done" text.
- No logic, copy, or data changes. No changes to `gateLinkFor`, gates, or any other file.

Out of scope: the "Connect your bank with Stripe" amber card below — that already has its own CTA elsewhere.