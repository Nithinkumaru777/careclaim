-- Seed policies
insert into policies (patient_id, policy_number, holder_name, plan_name, max_coverage_limit, copay_percentage, covered_treatments, excluded_treatments, valid_from, valid_to)
values 
('P-1001', 'CC-402', 'Rahul Sharma', 'Gold Plus', 500000.00, 10.00, '{"surgery.general", "room.standard", "medicines.essential", "diagnostics.standard"}', '{"cosmetic", "experimental", "supplements"}', '2023-01-01', '2030-12-31'),
('P-1002', 'CC-811', 'Anita Desai', 'Silver Care', 300000.00, 20.00, '{"room.standard", "medicines.essential", "diagnostics.standard"}', '{"cosmetic", "experimental", "surgery.advanced"}', '2023-01-01', '2030-12-31'),
('P-1003', 'CC-992', 'Vikram Singh', 'Platinum Elite', 1000000.00, 0.00, '{"surgery.general", "surgery.advanced", "room.private", "medicines.all", "diagnostics.all"}', '{"experimental"}', '2024-01-01', '2030-12-31');

-- Seed rate card
insert into rate_card (keyword, category, max_reasonable_cost)
values
('IV Paracetamol', 'medication', 500.00),
('Private Room', 'room', 8000.00),
('Appendectomy — laparoscopic', 'surgery', 85000.00),
('Blood Test - CBC', 'diagnostics', 1200.00),
('Rhinoplasty', 'surgery', 60000.00);

-- Seed demo login (matches Login.tsx defaults). Local dev only.
-- Token columns must be '' not NULL or GoTrue fails on sign-in.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', 'd0d0d0d0-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'demo@careclaim.ai', extensions.crypt('demo123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), 'd0d0d0d0-0000-4000-8000-000000000001', 'd0d0d0d0-0000-4000-8000-000000000001', 'email',
  '{"sub":"d0d0d0d0-0000-4000-8000-000000000001","email":"demo@careclaim.ai","email_verified":true}', now(), now(), now());

