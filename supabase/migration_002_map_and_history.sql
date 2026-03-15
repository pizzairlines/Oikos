-- Migration: Add coordinates for map + price history tracking
-- Run this in Supabase SQL Editor

-- Add latitude/longitude to listings for map display
ALTER TABLE listings ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create index for geo queries
CREATE INDEX IF NOT EXISTS idx_listings_geo ON listings(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Price history table: tracks price changes over time
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    price INTEGER NOT NULL,
    price_per_sqm REAL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_listing ON price_history(listing_id, recorded_at DESC);

-- RLS for price_history
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on price_history" ON price_history FOR ALL USING (true) WITH CHECK (true);
