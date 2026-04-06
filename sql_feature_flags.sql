-- =============================================
-- FEATURE FLAGS TABLE
-- Run this in Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN DEFAULT false,
  label       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  TEXT DEFAULT 'system'
);

-- Seed: semua fitur yang belum siap = false
INSERT INTO feature_flags (key, enabled, label, description) VALUES
  ('venue_booking',      false, 'Venue Booking',       'Tombol Book This Course & form booking tee time'),
  ('caddy_assignment',   false, 'Caddy Assignment',    'Dropdown pilih caddy saat buat round / check-in event'),
  ('staff_join_request', false, 'Staff Join Request',  'Tombol Join as Staff di halaman venue club'),
  ('invoice_download',   false, 'Invoice Download',    'Tombol download PDF invoice booking'),
  ('tee_time_picker',    false, 'Tee Time Picker',     'Slot pilih jam tee off di halaman venue'),
  ('venue_schedule_admin', false, 'Venue Schedule Admin', 'Tombol Confirm/Decline/Ready di ClubAdminDashboard')
ON CONFLICT (key) DO NOTHING;

-- Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION update_feature_flag_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feature_flags_updated ON feature_flags;
CREATE TRIGGER trg_feature_flags_updated
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_feature_flag_timestamp();
