
-- 1. Add columns to clubs
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS facility_type TEXT NOT NULL DEFAULT 'golf_club',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- 2. Add columns to courses
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS course_type TEXT NOT NULL DEFAULT 'championship',
  ADD COLUMN IF NOT EXISTS slope_rating NUMERIC(5,1) DEFAULT 113,
  ADD COLUMN IF NOT EXISTS course_rating NUMERIC(4,1) DEFAULT 72.0;

-- 3. Add created_by to tours and events
ALTER TABLE tours ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 4. Create system_admins table
CREATE TABLE IF NOT EXISTS system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_level TEXT NOT NULL DEFAULT 'moderator',
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS system_admins_user_id_idx ON system_admins(user_id);

ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System admins viewable by authenticated" ON system_admins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only super_admin can insert" ON system_admins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Only super_admin can update" ON system_admins FOR UPDATE TO authenticated USING (true);

-- 5. Create range_bays table
CREATE TABLE IF NOT EXISTS range_bays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  bay_number INTEGER NOT NULL,
  bay_type TEXT NOT NULL DEFAULT 'standard',
  price_per_hour INTEGER NOT NULL DEFAULT 50000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(club_id, bay_number)
);

ALTER TABLE range_bays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Range bays viewable" ON range_bays FOR SELECT USING (true);
CREATE POLICY "Auth can manage range bays" ON range_bays FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update range bays" ON range_bays FOR UPDATE TO authenticated USING (true);

-- 6. Create range_bookings table
CREATE TABLE IF NOT EXISTS range_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  bay_id UUID NOT NULL REFERENCES range_bays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  total_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  balls_bucket_count INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE range_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own range bookings" ON range_bookings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create range bookings" ON range_bookings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own range bookings" ON range_bookings FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- 7. Create range_lessons table
CREATE TABLE IF NOT EXISTS range_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES profiles(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  lesson_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  lesson_type TEXT NOT NULL DEFAULT 'individual',
  price INTEGER NOT NULL DEFAULT 300000,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE range_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Range lessons viewable by involved" ON range_lessons FOR SELECT TO authenticated USING (instructor_id = auth.uid() OR student_id = auth.uid());
CREATE POLICY "Auth can create range lessons" ON range_lessons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update range lessons" ON range_lessons FOR UPDATE TO authenticated USING (true);

-- 8. Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit log viewable by authenticated" ON audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert audit log" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);
