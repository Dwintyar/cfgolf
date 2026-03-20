
INSERT INTO system_admins (user_id, admin_level, is_active, notes)
VALUES ('a66cbc85-0832-483d-bce0-2c0b9aeaac9e', 'super_admin', true, 'Primary admin - dwintyar@gmail.com')
ON CONFLICT DO NOTHING;
