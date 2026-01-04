-- Create a test user directly in the database
-- Email: test@bjeffer.no
-- Password: password123

-- Enable pgcrypto if not already enabled (needed for password hashing)
create extension if not exists "pgcrypto";

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@bjeffer.no',
  crypt('password123', gen_salt('bf')),
  now(), -- This marks the email as confirmed!
  '{"provider":"email","providers":["email"]}',
  '{"full_name": "Test Person"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Note: The trigger we defined earlier (on_auth_user_created) 
-- will automatically run and create the public.profile entry for this user!
