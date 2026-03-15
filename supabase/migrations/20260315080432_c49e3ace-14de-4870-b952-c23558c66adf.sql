UPDATE auth.users
SET
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb),
  is_super_admin = COALESCE(is_super_admin, false)
WHERE email_change IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR raw_app_meta_data IS NULL
   OR is_super_admin IS NULL;