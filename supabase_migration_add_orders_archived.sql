-- Run this in Supabase SQL Editor if your orders table already exists (no archived column).
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
