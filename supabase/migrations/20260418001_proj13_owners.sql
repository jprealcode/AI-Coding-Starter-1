-- ============================================================
-- PROJ-13: Eigentümer-Stammdaten & Objekt-Erweiterung
-- Migration: owners table + extend properties with owner_id and
--            hauptverantwortlicher_user_id
-- Requires: PROJ-1 migration (is_admin() function must exist)
--           PROJ-2 migration (set_updated_at() function must exist)
-- ============================================================

-- 1. owners table (Eigentümer-Stammdaten)
CREATE TABLE IF NOT EXISTS public.owners (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (
    type IN ('Privatperson', 'GmbH', 'AG', 'KG', 'UG', 'GbR', 'WEG', 'Sonstige')
  ),
  street       TEXT,
  postal_code  TEXT,
  city         TEXT,
  email        TEXT,
  phone        TEXT,
  tax_id       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: owners
-- All authenticated users can read (OCR pipeline needs owner data)
CREATE POLICY "owners_select" ON public.owners
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can write
CREATE POLICY "owners_insert" ON public.owners
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "owners_update" ON public.owners
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "owners_delete" ON public.owners
  FOR DELETE USING (public.is_admin());

-- 4. Extend properties table
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS owner_id                    UUID REFERENCES public.owners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hauptverantwortlicher_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Trigger: auto-update updated_at on owners
--    (set_updated_at() function already exists from PROJ-2 migration)
CREATE TRIGGER trg_owners_updated_at
  BEFORE UPDATE ON public.owners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_owners_name       ON public.owners(name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_owners_type       ON public.owners(type);
CREATE INDEX IF NOT EXISTS idx_owners_city       ON public.owners(city text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_properties_owner  ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_hv     ON public.properties(hauptverantwortlicher_user_id);

-- ============================================================
-- SETUP INSTRUCTIONS (after running this migration):
--
-- Run this SQL in: Supabase Dashboard → SQL Editor → Run
--
-- Prerequisites:
--   - PROJ-1 migration must have been run (is_admin() function)
--   - PROJ-2 migration must have been run (set_updated_at() function)
-- ============================================================
