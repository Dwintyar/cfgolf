UPDATE auth.users
SET
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, '')
WHERE email_change IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL;