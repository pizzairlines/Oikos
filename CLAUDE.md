# Oikos — Claude Agent Configuration

## Project overview

Oikos is a Paris real estate opportunity detector. It scrapes listings from BienIci, PAP, and LeBonCoin, scores them (0–100) with a weighted algorithm, and sends WhatsApp alerts. The frontend is an Apple-style glass UI optimized for mobile.

**Live:** https://oikos-fawn.vercel.app
**Stack:** Next.js 16 + React 19 + Tailwind CSS 4 (frontend) · Python 3.11 + Playwright (scraper) · Supabase PostgreSQL (database)
**Deploy:** Vercel (frontend, auto-deploy from main) · Railway (scraper, auto-deploy from main)

---

## Agent system

This project uses a multi-agent architecture. Each domain has a specialized agent with its own rules, patterns, and checklists. **Read the relevant CLAUDE.md before touching any file.**

### Domain agents

| Agent | Path | Specialty |
|-------|------|-----------|
| **Frontend** | `web/CLAUDE.md` | Glass UI, React, Tailwind, mobile-first design |
| **Scraper** | `scraper/CLAUDE.md` | Data pipeline, Playwright, scoring algorithm |
| **Database** | `supabase/CLAUDE.md` | Schema, migrations, indexes, RLS |

### Slash commands

Workflows that chain multiple steps. Use these instead of improvising.

| Command | Purpose | When to use |
|---------|---------|-------------|
| `/ship` | Type-check → audit → commit → push → verify | Ready to push code |
| `/review` | Paranoid code review with full checklist | Before shipping, or on demand |
| `/design-audit` | Glass design system consistency check | After UI changes |
| `/perf-audit` | Bundle, query, image, rendering performance | Feels slow, or periodic check |
| `/score-tuning` | Analyze scoring on real data, suggest improvements | Scoring feels off |
| `/feature` | Plan → build → verify → ship a new feature | Starting something new |

### Routing — how to pick the right mode

```
User says "add X"         → /feature → build in order: supabase → scraper → web
User says "fix X"         → Read relevant CLAUDE.md → fix → /ship
User says "review X"      → /review
User says "it's ugly"     → /design-audit → fix → /ship
User says "it's slow"     → /perf-audit → fix → /ship
User says "scoring is off" → /score-tuning
User says "ship it"       → /ship
```

---

## Cognitive modes

Different tasks require different mindsets. **Never blend modes** — be explicit about which hat you're wearing.

### Build mode — ship fast, stay in patterns
- Read the relevant sub-CLAUDE.md first
- Follow existing patterns — don't reinvent
- Type-check before committing (`cd web && npx tsc --noEmit`)
- One concern per commit

### Review mode — be paranoid, find every bug
- Check for N+1 queries, missing error states, broken mobile layouts
- Verify Supabase RLS isn't bypassed
- Look for hardcoded values that should be in config
- Ask: "what happens when this fails?"

### Design mode — think Apple, every pixel matters
- Mobile-first, always. Desktop is the responsive layer
- Glass morphism: `.glass`, `.glass-strong`, `.glass-subtle`
- CTAs are black (`bg-foreground`), accents are purple (`primary`)
- Touch targets ≥ 40px, spacing in multiples of 4/5

### Data mode — be defensive, the web is messy
- Every scraped field can be null
- Deduplication: same listing on multiple sources
- Scoring changes affect every listing — test with real data
- Rate limiting: respect delays, never hammer a source

---

## Build order

When a feature touches multiple domains, always build in this order:

```
1. supabase/  → Schema changes first (migration file, test in SQL Editor)
2. scraper/   → Backend logic (new fields, scoring, alerts)
3. web/       → Frontend last (types → queries → hooks → components → pages)
```

This order ensures each layer has what it needs from the layer below.

---

## Commit conventions

```
<type>: <short description>

<optional body — explain why, not what>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `perf`, `refactor`, `style`, `docs`, `chore`

## Git config

```
user.name = pizzairlines
user.email = audouinalexis@gmail.com
```

Never push with `alexis@tomorro.com`. This is a personal project.

---

## Key files — read these first

| File | Why it matters |
|------|---------------|
| `web/src/app/globals.css` | Source of truth for the design system |
| `web/src/lib/types.ts` | All TypeScript interfaces — change here propagates everywhere |
| `web/src/lib/data.ts` | All Supabase queries — single source for data access |
| `scraper/scoring.py` | The scoring brain — 5 weighted components, 0–100 |
| `scraper/config.py` | All configuration + Paris arrondissement market data |
| `supabase/schema.sql` | Initial schema — don't modify, write migrations instead |

## Environment variables

```
SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
SUPABASE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY
TWILIO_ACCOUNT_SID          # optional
TWILIO_AUTH_TOKEN            # optional
TWILIO_WHATSAPP_FROM         # optional
```

---

## Rules — non-negotiable

These rules override everything. If a feature conflicts with a rule, the rule wins.

1. **Never commit secrets.** No API keys, tokens, or passwords in code. Ever.
2. **Type-check passes.** `npx tsc --noEmit` must succeed before any push.
3. **Tests pass.** `pytest` must succeed before any scraper push.
4. **Mobile first.** Every UI change must work at 375px width.
5. **Glass consistency.** No shadcn `<Card>` in pages — use `.glass` divs.
6. **French UI.** User-facing text is French. Code and comments are English.
7. **Supabase RLS.** All tables have RLS enabled. Never bypass it.
8. **One concern per commit.** Don't bundle unrelated changes.
9. **Defensive data.** Every scraped value can be null. Handle it.
10. **Update docs.** If you introduce a new pattern, update the relevant CLAUDE.md.
