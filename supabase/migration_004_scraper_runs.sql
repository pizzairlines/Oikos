-- Migration 004: Scraper run tracking for monitoring
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS scraper_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scraper_name TEXT NOT NULL,        -- 'bienici', 'pap', 'leboncoin'
    status TEXT NOT NULL DEFAULT 'running',  -- 'running', 'success', 'error'
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    listings_found INT DEFAULT 0,
    listings_new INT DEFAULT 0,
    listings_skipped INT DEFAULT 0,
    error_message TEXT,
    duration_seconds FLOAT
);

-- Index for quick "last run" lookups
CREATE INDEX IF NOT EXISTS idx_scraper_runs_name_started
    ON scraper_runs(scraper_name, started_at DESC);

-- RLS: allow anon read, service role write
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scraper_runs_read" ON scraper_runs FOR SELECT USING (true);
CREATE POLICY "scraper_runs_write" ON scraper_runs FOR ALL USING (true);

-- RPC to check scraper health: returns last run per scraper
-- If last run was > 2 hours ago or ended in error, it's unhealthy
CREATE OR REPLACE FUNCTION get_scraper_health()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT DISTINCT ON (scraper_name)
        scraper_name,
        status,
        started_at,
        finished_at,
        listings_found,
        listings_new,
        error_message,
        duration_seconds,
        CASE
          WHEN status = 'error' THEN 'unhealthy'
          WHEN finished_at IS NULL AND started_at < NOW() - INTERVAL '30 minutes' THEN 'stuck'
          WHEN finished_at < NOW() - INTERVAL '2 hours' THEN 'stale'
          ELSE 'healthy'
        END AS health
      FROM scraper_runs
      ORDER BY scraper_name, started_at DESC
    ) t
  );
END;
$$;
