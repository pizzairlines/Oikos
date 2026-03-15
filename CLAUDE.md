# Oikos — Claude Agent Configuration

## Project overview

Oikos is a Paris real estate opportunity detector. It scrapes listings from BienIci, PAP, and LeBonCoin, scores them (0–100) with a weighted algorithm, and sends WhatsApp alerts. The frontend is an Apple-style glass UI optimized for mobile.

**Live:** https://oikos-fawn.vercel.app
**Stack:** Next.js 16 + React 19 + Tailwind CSS 4 (frontend) · Python 3.11 + Playwright (scraper) · Supabase PostgreSQL (database)
**Deploy:** Vercel (frontend, auto-deploy from main) · Railway (scraper, auto-deploy from main)

## Architecture — three domains

```
web/        → Frontend agent (TypeScript, React, Tailwind)
scraper/    → Scraper agent (Python, Playwright, data pipeline)
supabase/   → Database agent (SQL, migrations, RLS policies)
```

Each directory has its own CLAUDE.md with domain-specific rules. **Read the relevant CLAUDE.md before touching any file in that directory.**

## Cognitive modes

Different tasks require different mindsets. Use the right mode:

### Build mode
You're adding a feature or fixing a bug. Ship fast, stay within patterns.
- Read the relevant sub-CLAUDE.md first
- Follow existing patterns — don't reinvent
- Type-check before committing (`cd web && npx tsc --noEmit`)
- Commit messages: imperative mood, explain the "why" not the "what"

### Review mode
You're auditing code quality, performance, or UX. Be paranoid.
- Check for N+1 queries, missing error states, broken mobile layouts
- Verify Supabase RLS isn't bypassed
- Look for hardcoded values that should be in config
- Ask: "what happens when this fails?"

### Design mode
You're making UI/UX decisions. Think Apple — minimal, considered, glass.
- Mobile-first, always. Desktop is the responsive layer, not the other way around
- Glass morphism: use `.glass`, `.glass-strong`, `.glass-subtle` from globals.css
- CTAs are black (`bg-foreground`), accents are purple (`primary`)
- Touch targets: minimum h-10 (40px), prefer h-11 or h-12
- Consistent spacing: `p-5` for card content, `mb-5` between cards, `gap-5` for grids
- Rounded corners: `rounded-2xl` for cards, `rounded-xl` for inputs/buttons, `rounded-full` for pills

### Data mode
You're working on scraping, scoring, or data pipeline. Be defensive.
- Every scraped field can be null — validate everything
- Deduplication matters: same listing on multiple sources
- Scoring changes affect every listing — test with real data
- Rate limiting: respect delays, rotate patterns

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

Always use these credentials. Never push with `alexis@tomorro.com`.

## Key files

| File | Purpose |
|------|---------|
| `web/src/app/globals.css` | Glass design system, color palette, animations |
| `web/src/lib/types.ts` | All TypeScript interfaces (Listing, Filters, etc.) |
| `web/src/lib/data.ts` | All Supabase queries (fetch, toggle, stats) |
| `web/src/hooks/use-listings.ts` | Listings hook with stale-while-revalidate cache |
| `scraper/scoring.py` | Opportunity score algorithm (5 weighted components) |
| `scraper/config.py` | All configuration and arrondissement price data |
| `supabase/schema.sql` | Database schema, indexes, RLS policies |

## Environment variables

```
# Supabase
SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
SUPABASE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY

# Twilio (optional)
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM
```

## Rules — non-negotiable

1. **Never commit secrets.** No API keys, tokens, or passwords in code.
2. **Type-check passes.** Don't push if `tsc --noEmit` fails.
3. **Mobile first.** Every UI change must look good on 375px width.
4. **Glass consistency.** No shadcn Card components in pages — use glass divs.
5. **French UI.** All user-facing text is in French. Code/comments in English.
6. **Supabase RLS.** All tables have Row Level Security enabled. Never bypass it.
