-- ─── device_pairs ────────────────────────────────────────────────────────────
-- Stores the pairing between two physical devices and their role (adrian/sarah).
-- Each pair has a short alphanumeric code used during the initial join flow.
-- A "claim_code" is used for the phone-replacement flow.

CREATE TABLE IF NOT EXISTS public.device_pairs (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 5-char alphanumeric pairing code shown during setup (e.g. "A3F9K")
  pair_code         text         NOT NULL UNIQUE,

  -- Device UUIDs — generated once on install and stored in AsyncStorage
  adrian_device_id  text         DEFAULT NULL,
  sarah_device_id   text         DEFAULT NULL,

  -- One-time claim code for phone replacement (6-char, expires after use)
  claim_code        text         DEFAULT NULL,
  claim_role        text         DEFAULT NULL,  -- 'adrian' or 'sarah'
  claim_expires_at  timestamptz  DEFAULT NULL,

  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

-- Enable RLS (open anon access — app enforces logic at service layer)
ALTER TABLE public.device_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_pairs_anon_select" ON public.device_pairs
  FOR SELECT TO anon USING (true);

CREATE POLICY "device_pairs_anon_insert" ON public.device_pairs
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "device_pairs_anon_update" ON public.device_pairs
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.device_pairs TO anon;
