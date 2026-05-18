## Goal
Update `/invest` to reflect pre-launch reality: remove the Traction section entirely, and replace the placeholder three-founder team with the real two-founder team (Brendan and Linda McGuigan).

## Changes to `src/routes/invest.tsx`

### 1. Remove Traction section
- Remove `<Traction />` from the page layout (line 57).
- Delete the `Traction` component definition (lines 394–410).
- Remove the `Users` icon import only if no longer used elsewhere (it's also used by `Team`, so keep it).

### 2. Replace the Team section
- Update the `team` array (lines 517–521) to two founders:
  - **Brendan McGuigan — Co-founder & CEO** — "Co-director of a 6-year construction business · operator who ships · lifelong traveller turning a personal obsession with travel video into a product."
  - **Linda McGuigan — Co-founder & COO** — "Co-director of a 6-year construction business · runs ops, finance and partnerships · creator-side instinct for travel content that actually converts."
- Update the section headline (line 526) from "Operators who've shipped this before." to something honest for a pre-launch founder team, e.g. **"Founders who've built and run a business together."**
- Change the grid from `md:grid-cols-3` to `md:grid-cols-2` and centre it (`mx-auto max-w-3xl`) so two cards sit nicely on desktop.

### 3. Update the "Why us" framing on the founder cards
Keep the existing card visual (gradient avatar, name, role, copy) — only the data changes. No structural CSS work beyond the grid column count.

## Out of scope
- No changes to deck PDFs / PPTX in `/public/decks` or the `scripts/` builders. If you want those regenerated to match, say the word and I'll do it as a follow-up.
- No copy changes to other sections (Market, Growth plan, The Ask, footer).

## Outcome
The live investor pitch will no longer claim waitlist / LOI / supply numbers the company hasn't earned yet, and the team section will accurately show Brendan and Linda McGuigan as the two co-founders with a credible joint-operator narrative.
