-- PROJ-3: Rechnungseingang — Quellen
-- Applied via Supabase MCP on 2026-04-14

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('upload', 'gmail', 'drive')),
  status TEXT NOT NULL CHECK (status IN ('neu', 'in_bearbeitung', 'freigegeben', 'bezahlt', 'fehler')) DEFAULT 'neu',
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  external_id TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read invoices" ON invoices FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can insert invoices" ON invoices FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can update invoices" ON invoices FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_source ON invoices(source);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_invoices_sha256_hash ON invoices(sha256_hash);
CREATE UNIQUE INDEX idx_invoices_external_id ON invoices(external_id) WHERE external_id IS NOT NULL;

CREATE TABLE source_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_connected BOOLEAN DEFAULT false NOT NULL,
  google_email TEXT,
  gmail_enabled BOOLEAN DEFAULT false NOT NULL,
  gmail_polling_interval INTEGER DEFAULT 15 NOT NULL,
  gmail_last_synced TIMESTAMPTZ,
  drive_enabled BOOLEAN DEFAULT false NOT NULL,
  drive_folder_id TEXT,
  drive_last_synced TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO source_settings DEFAULT VALUES;

ALTER TABLE source_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read settings" ON source_settings FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can update settings" ON source_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

CREATE TABLE google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton BOOLEAN DEFAULT true NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,
  account_email TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;
