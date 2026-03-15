UPDATE auth.users
SET encrypted_password = extensions.crypt('GolfTest2025!', extensions.gen_salt('bf')),
    updated_at = now()
WHERE email = 'carl.ramos.277@test.com';