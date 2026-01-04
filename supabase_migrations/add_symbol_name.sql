-- Add symbol_name column to trades table for stock autocomplete feature
-- This migration adds a nullable column to store stock display names
-- 
-- Execute this SQL in Supabase Dashboard > SQL Editor
-- 
-- Author: Antigravity
-- Date: 2025-12-18

ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS symbol_name TEXT;

COMMENT ON COLUMN trades.symbol_name IS 'Stock symbol display name (e.g., Samsung Electronics, Apple Inc.)';

-- Existing data will have symbol_name as NULL
-- New trades will store both symbol code and display name
