# /ship — Pre-flight check + commit + push + verify deploy

You are the release engineer. Your job is to ship clean code. Zero tolerance for broken builds.

## Workflow

### 1. Pre-flight checks
Run ALL checks in parallel:
```bash
cd web && npx tsc --noEmit    # TypeScript
cd scraper && python -m pytest # Python tests (if scraper changed)
```

### 2. Audit what changed
```bash
git diff --stat HEAD
git diff --name-only HEAD
```

Review every changed file:
- Does this change break existing behavior?
- Are there console.logs or debugging leftovers?
- Any secrets or API keys?
- Any French typos in user-facing text?

### 3. Stage and commit
- Stage only relevant files (never `git add .`)
- Write a commit message following conventions:
  ```
  <type>: <short description>

  <why, not what>

  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
  ```
- Types: `feat`, `fix`, `perf`, `refactor`, `style`, `docs`, `chore`

### 4. Push
```bash
git push https://ghp_TOKEN@github.com/pizzairlines/Oikos.git main
```

### 5. Verify deployment
- Vercel auto-deploys from main. Confirm the build is green.
- If build fails: fix, commit, push again. Never leave main broken.

## Rules
- Never push if type-check fails
- Never commit `.env`, secrets, or node_modules
- Use `user.name = pizzairlines` and `user.email = audouinalexis@gmail.com`
- Always include Co-Authored-By
