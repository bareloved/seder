# Beta Tutorial Video — Session Notes

## What We Did

1. **Brainstormed** the video concept — a 3-minute iPhone screen recording for friends-and-family beta testers (mix of freelancers and non-freelancers)
2. **Wrote the full spec** with shot-by-shot script → `docs/superpowers/specs/2026-03-27-beta-tutorial-video-design.md`
3. **Seeded demo data** into the `barrelloved@gmail.com` account (which has Google Calendar connected)

## Key Decisions

- **Lead with calendar import** — it's the hero feature, not manual entry
- **Don't mention competitors** (iCount, Morning, etc.) — frame it purely as the user's problem + Seder's solution
- **Narrative:** "As a freelancer, it's hard to track what you earned, from whom, and what's still unpaid. Seder puts it all in order."
- **Format:** Hebrew voiceover + text captions at segment transitions

## Video Structure (6 segments, ~3 min)

1. Intro hook (20s)
2. Calendar import (45s) — the wow moment
3. Refining & manual entry (30s)
4. Value prop + Hebrew/VAT (35s)
5. Analytics & clients (30s)
6. Closing CTA — "send feedback from the app" (15s)

## Demo Data

- **Account:** barrelloved@gmail.com (Google Calendar already connected)
- **Reset command:** `pnpm seed:demo` (idempotent, clears and recreates)
- **Script:** `scripts/seed-demo-account.ts`
- **Data:**
  - 4 categories: שיעורים, הופעות, הקלטות, ייעוץ
  - 4 clients: נועה לוי, מרכז המוזיקה תל אביב, אולפני ברקן, עירית רמת גן
  - 20 income entries across Jan–Mar 2026
    - **Jan:** 5 entries, all paid (green dot on month picker)
    - **Feb:** 5 entries, 3 paid + 2 unpaid (red dot)
    - **Mar:** 10 entries, mixed statuses

## What's Left

- [ ] Record the video on iPhone
- [ ] Add text captions during editing
- [ ] (Optional) Do a dry run first to practice the tap flow
- [ ] Turn on Do Not Disturb before recording
