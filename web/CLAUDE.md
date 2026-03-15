# Web — Frontend Agent

You are the frontend specialist for Oikos. You build a fast, beautiful, mobile-first real estate app.

## Tech stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS 4 with OKLCH color space
- **Components:** Custom glass components (NOT shadcn Card). shadcn Button, Input, Select, Switch, Skeleton are OK.
- **Data:** Supabase JS client, all queries in `src/lib/data.ts`
- **State:** React hooks, no external state library. Custom hooks in `src/hooks/`.

## Design system — Apple glass

The UI follows an Apple-inspired glass morphism language. Everything is translucent, blurred, and layered.

### Glass classes (defined in `globals.css`)

| Class | Use case | Opacity | Blur |
|-------|----------|---------|------|
| `.glass` | Default cards, sections | 0.65 | 20px |
| `.glass-strong` | Modals, filters, important panels | 0.78 | 40px |
| `.glass-subtle` | Metric boxes, secondary elements | 0.45 | 12px |

### Color palette

```css
--primary: oklch(0.55 0.2 260)     /* Purple-blue — accents, links, active states */
--foreground: oklch(0.13 0.02 260)  /* Near-black — CTAs, text */
--background: oklch(0.975 0.005 250) /* Off-white base */
```

Body has a fixed mesh gradient background (3 radial gradients: purple, pink, teal).

### Spacing rules

```
Cards:        p-5 (padding), mb-5 (gap between cards), rounded-2xl
Section header: px-5 pt-5 pb-3
Section body:   px-5 pb-5
Grids:        gap-5
Inputs:       h-11 rounded-xl
Buttons:      h-10 to h-12, rounded-xl
Pills:        h-9 rounded-full
Touch targets: minimum 40px (h-10)
```

### Button variants

- **CTA (default):** Black (`bg-foreground text-background`). Use for primary actions.
- **Outline:** White with border. Use for secondary actions, pagination.
- **Ghost:** Transparent. Use for back buttons, subtle actions.
- Active pills (arrondissements): `bg-primary text-primary-foreground`

### Typography

- Card titles: `text-[15px] font-semibold`
- Section headers: `text-sm font-semibold`
- Labels: `text-xs font-medium text-muted-foreground`
- Small text: `text-[11px]` or `text-[10px]`

## File structure

```
src/
├── app/
│   ├── globals.css          # Design system tokens, glass classes, animations
│   ├── layout.tsx           # Root layout (sidebar + bottom nav + toast)
│   ├── page.tsx             # Home — listing grid + filters + pagination
│   ├── favorites/page.tsx   # Favorites grid
│   ├── stats/page.tsx       # Statistics dashboard
│   ├── settings/page.tsx    # Alert configuration
│   └── listing/[id]/page.tsx # Detail page (gallery, metrics, score, simulator)
├── components/
│   ├── BottomNav.tsx        # Mobile bottom nav (glass, 4 tabs)
│   ├── AppSidebar.tsx       # Desktop sidebar (shadcn Sidebar)
│   ├── ListingCard.tsx      # Listing card (glass, image, metrics)
│   ├── Filters.tsx          # Filter panel (glass-strong, expandable)
│   ├── ScoreBadge.tsx       # Score circle (colored 0–100)
│   ├── PhotoGallery.tsx     # Image gallery + lightbox
│   ├── ListingSkeleton.tsx  # Loading skeletons (glass)
│   ├── ErrorState.tsx       # Error state with retry
│   └── Toast.tsx            # Toast notification system
├── hooks/
│   ├── use-listings.ts      # Listings with stale-while-revalidate cache
│   ├── use-favorites.ts     # Favorites toggle + list
│   └── use-alerts.ts        # Alert CRUD
└── lib/
    ├── data.ts              # All Supabase queries
    ├── types.ts             # TypeScript interfaces
    ├── supabase.ts          # Supabase client singleton
    └── utils.ts             # Formatters (price, arrondissement, cn)
```

## Patterns to follow

### Data fetching
All queries go through `src/lib/data.ts`. Never call Supabase directly from components.
```typescript
// Good
import { fetchListings } from "@/lib/data";
// Bad
import { supabase } from "@/lib/supabase"; // Don't use in components
```

### Parallel requests
When a page needs multiple data sources, use `Promise.all`:
```typescript
const [data, favIds, history] = await Promise.all([
  fetchListingById(id),
  fetchFavoriteIds(),
  fetchPriceHistory(id),
]);
```

### Glass cards (not shadcn Card)
```tsx
// Good
<div className="glass rounded-2xl mb-5">
  <div className="px-5 pt-5 pb-3">
    <h3 className="text-sm font-semibold">Title</h3>
  </div>
  <div className="px-5 pb-5">
    {/* content */}
  </div>
</div>

// Bad — don't use Card components in pages
<Card><CardHeader><CardTitle>Title</CardTitle></CardHeader><CardContent>...</CardContent></Card>
```

### Animations
- Card entrance: `animate-card-enter` with staggered `animationDelay`
- Panel appear: `animate-fade-in-up`
- Hover: `hover:shadow-xl hover:scale-[1.01]` on cards

### Error handling
Every page has three states: loading (skeleton), error (ErrorState with retry), empty (illustration + message + action button).

## Common mistakes — don't repeat these

| Mistake | Fix |
|---------|-----|
| Import `Card` from shadcn in a page | Use `<div className="glass rounded-2xl">` |
| `p-5` on both header and content divs | Header: `px-5 pt-5 pb-3`, Content: `px-5 pb-5` |
| Button default looks purple | Default is black (`bg-foreground`). Purple is for accents only. |
| `count: "exact"` on Supabase query | Use `count: "planned"` — 10x faster |
| `select("*")` for grid listings | Use `CARD_FIELDS` constant — skip `description`, `photos` |
| Toast hidden behind bottom nav | Toast position: `bottom-20 md:bottom-4` |
| Missing Safari prefix | Always pair `backdrop-filter` with `-webkit-backdrop-filter` |
| Hardcoded French text with typos | Double-check accents: é, è, ê, à, ç |

## New component checklist

When creating a new component:

- [ ] Uses glass classes (not Card)
- [ ] Has loading skeleton variant
- [ ] Has error state
- [ ] Has empty state (if applicable)
- [ ] Touch targets ≥ 40px
- [ ] Works at 375px
- [ ] Animations: `animate-card-enter` or `animate-fade-in-up`
- [ ] French user-facing text
- [ ] All Supabase calls go through `data.ts`

## Before committing

1. `npx tsc --noEmit` — must pass
2. Check mobile layout (375px width)
3. Verify glass consistency — no raw Card imports in pages
4. French for all user-facing text
5. Check the three states: loading, error, empty
