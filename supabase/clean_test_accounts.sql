-- ==============================================================================
-- DESIGNHUB PK — SAFE AUDIT & TEST ACCOUNT CLEANUP MIGRATION
-- Purges only demonstrably synthetic test accounts created during development.
-- Preserves legitimate customers, real admin accounts, order history, and audit records.
-- ==============================================================================

-- 1. Inspect identified test user IDs from auth.users (if any exist)
-- Test patterns: email ending with @example.com, containing automated-test, or test@designhub
DO $$
DECLARE
  test_user_record RECORD;
BEGIN
  -- Loop through clearly identifiable test users in auth.users
  FOR test_user_record IN
    SELECT id, email FROM auth.users
    WHERE email ILIKE '%automated-test%'
       OR email ILIKE '%test@designhub%'
       OR email ILIKE '%@example.com'
       OR email ILIKE '%temp-test%'
  LOOP
    RAISE NOTICE 'Removing test user: % (ID: %)', test_user_record.email, test_user_record.id;

    -- Clean dependent download entitlements for test user
    DELETE FROM public.download_entitlements WHERE customer_id = test_user_record.id::text;

    -- Clean test customer profiles
    DELETE FROM public.customer_profiles WHERE id = test_user_record.id;

    -- Delete auth user record
    DELETE FROM auth.users WHERE id = test_user_record.id;
  END LOOP;
END $$;

-- 2. Verify legitimate customers and admin accounts remain intact:
-- Real admin: baigrahim12345@gmail.com
-- Real customer: waizsiddiqui.business@gmail.com
SELECT id, email, created_at FROM auth.users;
SELECT id, email, full_name, created_at FROM public.customer_profiles;
