-- Migration 003: Server-side stats RPC
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
--
-- Replaces client-side aggregation with a single RPC call.
-- Returns all stats data as JSON in one round-trip.

CREATE OR REPLACE FUNCTION get_listing_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  WITH active AS (
    SELECT *
    FROM listings
    WHERE is_active = TRUE
      AND price_per_sqm IS NOT NULL
      AND price_per_sqm > 0
  ),
  kpis AS (
    SELECT
      COUNT(*)::int AS total_listings,
      ROUND(AVG(price_per_sqm))::int AS avg_price_sqm,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_per_sqm))::int AS median_price_sqm,
      ROUND(AVG(opportunity_score))::int AS avg_score
    FROM active
  ),
  by_arr AS (
    SELECT
      arrondissement AS arr,
      COUNT(*)::int AS count,
      ROUND(AVG(price_per_sqm))::int AS avg_price_sqm,
      ROUND(AVG(opportunity_score))::int AS avg_score
    FROM active
    WHERE arrondissement IS NOT NULL
    GROUP BY arrondissement
    ORDER BY arrondissement
  ),
  price_dist AS (
    SELECT
      CASE
        WHEN price_per_sqm < 5000 THEN '< 5k'
        WHEN price_per_sqm < 6000 THEN '5-6k'
        WHEN price_per_sqm < 7000 THEN '6-7k'
        WHEN price_per_sqm < 8000 THEN '7-8k'
        WHEN price_per_sqm < 8500 THEN '8-8.5k'
        ELSE '> 8.5k'
      END AS range,
      COUNT(*)::int AS count,
      -- Keep insertion order via a sort key
      CASE
        WHEN price_per_sqm < 5000 THEN 1
        WHEN price_per_sqm < 6000 THEN 2
        WHEN price_per_sqm < 7000 THEN 3
        WHEN price_per_sqm < 8000 THEN 4
        WHEN price_per_sqm < 8500 THEN 5
        ELSE 6
      END AS sort_key
    FROM active
    GROUP BY range, sort_key
    ORDER BY sort_key
  ),
  score_dist AS (
    SELECT
      CASE
        WHEN opportunity_score < 20 THEN '0-20'
        WHEN opportunity_score < 40 THEN '20-40'
        WHEN opportunity_score < 60 THEN '40-60'
        WHEN opportunity_score < 80 THEN '60-80'
        ELSE '80-100'
      END AS range,
      COUNT(*)::int AS count,
      CASE
        WHEN opportunity_score < 20 THEN 1
        WHEN opportunity_score < 40 THEN 2
        WHEN opportunity_score < 60 THEN 3
        WHEN opportunity_score < 80 THEN 4
        ELSE 5
      END AS sort_key
    FROM active
    GROUP BY range, sort_key
    ORDER BY sort_key
  ),
  top5 AS (
    SELECT
      id, title, arrondissement, price_per_sqm, surface, opportunity_score
    FROM active
    ORDER BY opportunity_score DESC
    LIMIT 5
  )
  SELECT json_build_object(
    'totalListings', (SELECT total_listings FROM kpis),
    'avgPriceSqm', (SELECT avg_price_sqm FROM kpis),
    'medianPriceSqm', (SELECT median_price_sqm FROM kpis),
    'avgScore', (SELECT avg_score FROM kpis),
    'byArrondissement', COALESCE((SELECT json_agg(row_to_json(by_arr)) FROM by_arr), '[]'::json),
    'priceDistribution', COALESCE((SELECT json_agg(json_build_object('range', range, 'count', count)) FROM price_dist), '[]'::json),
    'scoreDistribution', COALESCE((SELECT json_agg(json_build_object('range', range, 'count', count)) FROM score_dist), '[]'::json),
    'topOpportunities', COALESCE((SELECT json_agg(row_to_json(top5)) FROM top5), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;
