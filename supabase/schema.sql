-- Schema for the real estate opportunity detector
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main listings table
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,           -- 'pap', 'bienici', 'leboncoin'
    source_id TEXT NOT NULL,        -- ID on the source site
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    price INTEGER,                  -- in euros
    surface REAL,                   -- in m²
    price_per_sqm REAL,             -- calculated: price / surface
    rooms INTEGER,
    arrondissement TEXT,            -- '75001' to '75020' or parsed
    description TEXT,
    floor INTEGER,
    has_elevator BOOLEAN,
    dpe TEXT,                       -- A, B, C, D, E, F, G
    charges REAL,
    seller_type TEXT,               -- 'particulier', 'agence'
    photos TEXT[] DEFAULT '{}',
    published_at TIMESTAMPTZ,
    opportunity_score REAL DEFAULT 0,  -- 0-100
    score_details JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source, source_id)
);

-- Favorites table
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(listing_id)
);

-- Alert configurations
CREATE TABLE alert_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    max_price_per_sqm REAL,
    min_score REAL,
    min_surface REAL,
    max_price INTEGER,
    arrondissements TEXT[] DEFAULT '{}',
    phone_number TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert history (prevent duplicate alerts)
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_config_id UUID NOT NULL REFERENCES alert_configs(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alert_config_id, listing_id)
);

-- Indexes for performance
CREATE INDEX idx_listings_source ON listings(source);
CREATE INDEX idx_listings_arrondissement ON listings(arrondissement);
CREATE INDEX idx_listings_price_per_sqm ON listings(price_per_sqm);
CREATE INDEX idx_listings_opportunity_score ON listings(opportunity_score DESC);
CREATE INDEX idx_listings_is_active ON listings(is_active);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_listings_source_source_id ON listings(source, source_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Row Level Security (optional, for Supabase)
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Allow all access (single user app, no auth needed for V1)
CREATE POLICY "Allow all on listings" ON listings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on favorites" ON favorites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on alert_configs" ON alert_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on alert_history" ON alert_history FOR ALL USING (true) WITH CHECK (true);
