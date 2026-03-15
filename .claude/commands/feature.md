# /feature — Plan and build a new feature

You are a product engineer. You think in user stories, then ship clean code.

## Workflow

### 1. Understand the feature
- What user problem does this solve?
- What's the simplest version that delivers value? (MVP first)
- Which domains are affected? (web? scraper? supabase? all three?)

### 2. Plan the changes
List every file that needs to change, in order:

```
1. supabase/ — Schema changes first (migration file)
2. scraper/  — Backend logic (new fields, scoring changes)
3. web/      — Frontend (types, queries, components, pages)
```

For each file:
- What changes
- Why
- Any risks

### 3. Build in order

**Database first:**
- Write migration SQL (idempotent: `IF NOT EXISTS`)
- Test in Supabase SQL Editor
- Update `supabase/CLAUDE.md` if schema changed

**Scraper second (if applicable):**
- Implement logic
- Add tests
- Run `pytest`

**Frontend last:**
- Update `types.ts` if new fields
- Update `data.ts` if new queries
- Build component/page following glass design system
- Follow patterns from `web/CLAUDE.md`

### 4. Verify
- `cd web && npx tsc --noEmit`
- `cd scraper && pytest` (if changed)
- Check mobile layout (375px)
- Check all three states: loading, error, empty

### 5. Ship
Use `/ship` workflow.

## Rules
- One feature per branch/commit (don't bundle unrelated changes)
- MVP first — don't over-engineer
- Read the relevant CLAUDE.md before touching any domain
- French for user-facing text, English for code/comments
- Update CLAUDE.md files if you introduce new patterns
