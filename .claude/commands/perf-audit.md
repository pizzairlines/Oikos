# /perf-audit — Performance deep-dive

You are a performance engineer. Find every millisecond of waste. The goal: instant page loads on 4G mobile.

## Frontend audit

### 1. Bundle analysis
```bash
cd web && npx next build 2>&1 | tail -30
```
Check:
- Total First Load JS for each route
- Any route > 100KB is suspicious
- Look for large dependencies pulled into client bundles

### 2. Data fetching
Read `web/src/lib/data.ts` and check:
- [ ] `select()` only fetches needed columns (not `*`)
- [ ] `count: "planned"` not `count: "exact"` for pagination
- [ ] Parallel requests with `Promise.all` where possible
- [ ] Stale-while-revalidate cache active? (check `use-listings.ts`)
- [ ] No waterfalls: child doesn't wait for parent data unnecessarily

### 3. Images
- [ ] Next.js `<Image>` used everywhere (not `<img>`)
- [ ] `sizes` attribute reflects actual rendered size
- [ ] `loading="lazy"` on below-fold images
- [ ] `priority` only on LCP image (first visible photo)
- [ ] Photo URLs: are they optimized? CDN? WebP?

### 4. Rendering
- [ ] No unnecessary client components (check `"use client"` directives)
- [ ] Memoization where needed (`useMemo`, `useCallback` with correct deps)
- [ ] No state updates in loops or effects that cascade
- [ ] Skeleton loaders prevent layout shift (CLS = 0)

## Database audit

### 5. Query performance
Check Supabase dashboard → Database → Query Performance:
- Any query > 100ms?
- Missing indexes for active filter/sort combos?
- Composite indexes needed?

### 6. Index coverage
Cross-reference `supabase/schema.sql` indexes with actual query patterns in `data.ts`:
```
Grid: WHERE is_active=true ORDER BY X → idx_listings_is_active + idx for each sort
Stats: GROUP BY arrondissement → idx_listings_arrondissement
Favorites: JOIN favorites → idx on listing_id
```

## Scraper audit

### 7. Scraping performance
- [ ] Playwright launches ONE browser, reuses contexts (not one browser per page)
- [ ] Concurrent scraping across sources? (or sequential with good reason)
- [ ] Unnecessary page loads? (API endpoints preferred over HTML scraping)
- [ ] Response size: are we downloading images we don't need?

## Output format

```
Route/File          | Issue                        | Impact    | Fix
--------------------|------------------------------|-----------|----
/ (home)            | Fetches photos[] for grid    | -200ms    | Add CARD_FIELDS without photos
/listing/[id]       | Sequential API calls         | -400ms    | Promise.all (done?)
data.ts             | count: "exact"               | -100ms    | Switch to "planned"
listings table      | No composite index           | -50ms     | CREATE INDEX on (is_active, score DESC)
```

End with: estimated total improvement and priority order.
