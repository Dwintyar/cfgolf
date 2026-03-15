-- Helper functions for admin checks (SECURITY DEFINER to bypass RLS)

CREATE OR REPLACE FUNCTION is_platform_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_admins
    WHERE user_id = check_user_id
      AND admin_level = 'super_admin'
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_club_admin(check_club_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE club_id = check_club_id
      AND user_id = check_user_id
      AND role IN ('owner','admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION get_admin_level(check_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
  level TEXT;
BEGIN
  SELECT admin_level INTO level
  FROM system_admins
  WHERE user_id = check_user_id AND is_active = true;
  RETURN COALESCE(level, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Insert courses for clubs that may not have one yet
INSERT INTO courses (id, name, location, description, par, holes_count, green_fee_price, slope_rating, course_rating, course_type, club_id) VALUES
('c1000000-0000-0000-0000-000000000001','Royal Course','Bekasi, Indonesia','Championship course dengan water hazards di 6 hole strategis',72,18,750000,125.0,72.5,'championship','1bbcc9f6-e010-42bb-bd1b-7d5a8c55837a'),
('c1000000-0000-0000-0000-000000000002','Grand Links','Tangerang, Indonesia','Fairway bergelombang dengan pemandangan pegunungan yang memukau',72,18,650000,118.0,71.0,'championship','a1dfa167-26a8-4c1b-ad05-64c87af41430'),
('c1000000-0000-0000-0000-000000000003','Emerald Course','Tangerang, Indonesia','Suasana tropis nan hijau, 18 hole dengan hazard alami',71,18,700000,120.0,70.5,'resort','dccb32df-206a-43aa-8b16-afa758301380'),
('c1000000-0000-0000-0000-000000000004','Golden Fairways','Jakarta Selatan, Indonesia','Desain parkland klasik dengan bunkering strategis',72,18,600000,116.0,71.8,'championship','bff7dab1-3cf6-4232-92ea-f57da69a8fa6'),
('c1000000-0000-0000-0000-000000000005','Imperial Layout','Medan, Indonesia','Fairway lebar dengan bunkering strategis khas links',72,18,800000,130.0,73.5,'championship','63e17523-df27-41f8-9676-dc32fd68129e'),
('c1000000-0000-0000-0000-000000000006','Palm Course','Makassar, Indonesia','Fairway berjajar pohon kelapa, green yang generous',70,18,550000,112.0,69.5,'resort','cfe08c20-c490-4bbb-837a-b415984278fb'),
('c1000000-0000-0000-0000-000000000007','Eagle Links','Jakarta Selatan, Indonesia','Course bergaya links dengan angin menjadi faktor utama',72,18,850000,128.0,72.0,'championship','47ec47b9-1782-4369-bf90-82aed7399066'),
('c1000000-0000-0000-0000-000000000008','Sunset Course','Bekasi, Indonesia','18 hole dengan pemandangan sunset terbaik di kawasan Bekasi',72,18,700000,119.0,71.5,'resort','5b87659d-4964-41de-be1e-51cf65419528'),
('c1000000-0000-0000-0000-000000000009','Blue Sky Course','Surabaya, Indonesia','Championship course dengan langit biru khas Surabaya',72,18,900000,132.0,73.0,'championship','be743938-e792-4f51-9b71-2b25fb7a52c5'),
('c1000000-0000-0000-0000-000000000010','Valley Links','Jakarta Utara, Indonesia','Course unik di kawasan Jakarta Utara, dekat pantai',71,18,650000,117.0,70.8,'resort','0dcb4380-3a16-4bfa-81dd-c40cf7a66fa2')
ON CONFLICT (id) DO NOTHING;

-- Insert hole data for courses
DO $$
DECLARE
  cid UUID;
  course_ids UUID[] := ARRAY[
    'c1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000004',
    'c1000000-0000-0000-0000-000000000005','c1000000-0000-0000-0000-000000000006',
    'c1000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000008',
    'c1000000-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000010'
  ];
  pars INT[] := ARRAY[4,5,3,4,4,3,5,4,4,4,5,3,4,4,3,5,4,4];
  dists INT[] := ARRAY[375,505,162,388,415,175,520,400,360,385,510,158,405,430,188,525,392,420];
  hdcps INT[] := ARRAY[7,1,17,5,3,15,11,9,13,8,2,18,4,6,16,10,12,14];
BEGIN
  FOREACH cid IN ARRAY course_ids LOOP
    FOR h IN 1..18 LOOP
      INSERT INTO course_holes (course_id, hole_number, par, distance_yards, handicap_index)
      VALUES (cid, h, pars[h], dists[h] + floor(random()*30-15)::int, hdcps[h])
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;