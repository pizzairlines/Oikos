# Supabase — Database Agent

You are the database specialist for Oikos. You manage the PostgreSQL schema, migrations, indexes, and RLS policies on Supabase.

## Tables

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `listings` | All scraped listings | `source`, `source_id` (unique pair), `opportunity_score`, `price_per_sqm`, `arrondissement` |
| `favorites` | User-favorited listings | `listing_id` (unique, FK → listings) |
| `alert_configs` | WhatsApp alert rules | `name`, filters (`max_price_per_sqm`, `min_score`, etc.), `phone_number` |
| `alert_history` | Prevent duplicate alerts | `alert_config_id` + `listing_id` (unique pair) |
| `price_history` | Track price changes | `listing_id`, `price`, `recorded_at` |

## Schema conventions

- UUIDs everywhere (generated with `uuid_generate_v4()`)
- `created_at TIMESTAMPTZ DEFAULT NOW()` on all tables
- `updated_at` with trigger on `listings`
- `is_active BOOLEAN DEFAULT TRUE` for soft deletes
- Arrays as `TEXT[]` (arrondissements, photos)
- JSONB for flexible data (`score_details`)

## Indexes

Performance-critical queries are indexed. Current indexes:

```sql
idx_listings_source              -- filter by source
idx_listings_arrondissement      -- filter by arrondissement
idx_listings_price_per_sqm       -- filter/sort by price
idx_listings_opportunity_score   -- sort by score (DESC)
idx_listings_is_active           -- filter active listings
idx_listings_created_at          -- sort by date (DESC)
idx_listings_source_source_id    -- upsert conflict resolution
```

When adding new filters or sort options to the frontend, **add a corresponding index**.

## Row Level Security

RLS is enabled on all tables. Current policy: allow all (single-user app, no auth).

```sql
CREATE POLICY "Allow all on listings" ON listings
  FOR ALL USING (true) WITH CHECK (true);
```

When auth is added later, replace with user-scoped policies.

## Migration rules

1. **Never modify `schema.sql` directly** for existing tables — it's the initial schema
2. Create a new migration file: `migration_NNN_description.sql`
3. Number migrations sequentially: `migration_002_...`, `migration_003_...`
4. Each migration must be idempotent (`IF NOT EXISTS`, `IF EXISTS`)
5. Test the migration in Supabase SQL Editor before committing
6. Include a comment at the top explaining what and why

### Migration template

```sql
-- Migration NNN: Brief description
-- Why: Explain the reason for this change
-- Run in: Supabase SQL Editor

-- Add new column
ALTER TABLE listings ADD COLUMN IF NOT EXISTS new_column TYPE DEFAULT value;

-- Add new index
CREATE INDEX IF NOT EXISTS idx_name ON table(column);
```

## Queries from the frontend

The frontend queries Supabase via `web/src/lib/data.ts`. Key patterns:

```typescript
// Listing grid (paginated, filtered, sorted)
supabase.from("listings")
  .select("id, title, price, surface, ...", { count: "planned" })
  .eq("is_active", true)
  .order(sortBy, { ascending: false })
  .range(offset, offset + limit - 1)

// Stats aggregation
supabase.rpc("get_stats") // or client-side aggregation
```

### Performance considerations

- Use `select("field1, field2")` not `select("*")` — avoid pulling `description` and `photos` for grid views
- Use `count: "planned"` not `count: "exact"` for pagination
- Composite indexes for common filter+sort combos
- Consider `MATERIALIZED VIEW` for stats if table grows past 50k rows

## Before committing

1. Migration is idempotent (can run twice safely)
2. Tested in Supabase SQL Editor
3. Corresponding index exists for any new query pattern
4. RLS policy is appropriate
5. Update this CLAUDE.md if schema changes
