-- Cleanup: deactivate listings above 8500 €/m²
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)

-- Step 1: Preview — count affected listings by arrondissement
SELECT
    arrondissement,
    COUNT(*) as count,
    ROUND(AVG(price_per_sqm)::numeric, 0) as avg_price_sqm,
    ROUND(MIN(price_per_sqm)::numeric, 0) as min_price_sqm,
    ROUND(MAX(price_per_sqm)::numeric, 0) as max_price_sqm
FROM listings
WHERE is_active = TRUE
  AND price_per_sqm > 8500
GROUP BY arrondissement
ORDER BY count DESC;

-- Step 2: Deactivate them (uncomment to run)
-- UPDATE listings
-- SET is_active = FALSE, updated_at = NOW()
-- WHERE is_active = TRUE
--   AND price_per_sqm > 8500;
