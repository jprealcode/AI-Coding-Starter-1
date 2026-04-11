-- ============================================================
-- PROJ-2: Verwaltungsobjekte & Stammdaten
-- Migration: properties und bank_accounts Tabellen, RLS, Trigger
-- Requires: PROJ-1 migration (is_admin() function must exist)
-- ============================================================

-- 1. Properties table (Verwaltungsobjekte / Liegenschaften)
CREATE TABLE IF NOT EXISTS public.properties (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_number TEXT NOT NULL,
  name          TEXT NOT NULL,
  street        TEXT NOT NULL DEFAULT '',
  postal_code   TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL DEFAULT '',
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT properties_object_number_unique UNIQUE (object_number)
);

-- 2. Bank accounts table (Bankverbindungen, 1–N je Objekt)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  iban           TEXT NOT NULL,
  bic            TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  bank_name      TEXT NOT NULL,
  is_default     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Enable RLS on both tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: properties
-- All authenticated users can read (required for PROJ-3+ invoice assignment)
CREATE POLICY "properties_select" ON public.properties
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can write
CREATE POLICY "properties_insert" ON public.properties
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "properties_update" ON public.properties
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "properties_delete" ON public.properties
  FOR DELETE USING (public.is_admin());

-- 5. RLS Policies: bank_accounts
CREATE POLICY "bank_accounts_select" ON public.bank_accounts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "bank_accounts_insert" ON public.bank_accounts
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "bank_accounts_update" ON public.bank_accounts
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "bank_accounts_delete" ON public.bank_accounts
  FOR DELETE USING (public.is_admin());

-- 6. Trigger: ensure only one is_default bank account per property
--    When any bank account is set to is_default = TRUE, all others
--    for the same property are automatically set to FALSE.
CREATE OR REPLACE FUNCTION public.enforce_single_default_bank_account()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.bank_accounts
       SET is_default = FALSE
     WHERE property_id = NEW.property_id
       AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_single_default_bank_account
  AFTER INSERT OR UPDATE OF is_default ON public.bank_accounts
  FOR EACH ROW WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION public.enforce_single_default_bank_account();

-- 7. Trigger: auto-update updated_at on properties
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_object_number ON public.properties(object_number);
CREATE INDEX IF NOT EXISTS idx_properties_is_active     ON public.properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_name          ON public.properties(name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_properties_city          ON public.properties(city text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_property   ON public.bank_accounts(property_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_default    ON public.bank_accounts(property_id, is_default);

-- ============================================================
-- SETUP INSTRUCTIONS (after running this migration):
--
-- Run this SQL in: Supabase Dashboard → SQL Editor → Run
--
-- Prerequisites:
--   - PROJ-1 migration must have been run first
--     (is_admin() function must exist)
--
-- No additional Dashboard configuration needed.
-- ============================================================
