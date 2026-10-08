create table policies (
  id uuid primary key default gen_random_uuid(),
  patient_id varchar(255) not null,
  policy_number varchar(255) unique not null,
  holder_name text not null,
  plan_name text not null,
  max_coverage_limit numeric(12,2) not null check (max_coverage_limit > 0),
  copay_percentage numeric(5,2) not null check (copay_percentage between 0 and 100),
  covered_treatments text[] not null,
  excluded_treatments text[] not null,
  valid_from date not null,
  valid_to date not null,
  created_at timestamptz default now()
);

create table rate_card (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  category text not null,
  max_reasonable_cost numeric(12,2) not null
);

create table claims (
  id uuid primary key default gen_random_uuid(),
  hospital_user_id uuid not null default auth.uid() references auth.users(id),
  policy_id uuid not null references policies(id),
  patient_id varchar(255) not null,
  diagnosis_code varchar(100) not null,
  raw_bill_data jsonb not null,
  total_billed numeric(12,2) not null check (total_billed > 0),
  status varchar(50) not null default 'PENDING'
    check (status in ('PENDING','PROCESSING','APPROVED','PARTIAL','DENIED')),
  approved_amount numeric(12,2) not null default 0,
  payout_breakdown jsonb,
  ai_reasoning_log jsonb,
  model_used text,
  processing_ms integer,
  created_at timestamptz default now(),
  processed_at timestamptz
);
create index on claims (hospital_user_id, created_at desc);

alter table claims enable row level security;
alter table policies enable row level security;
alter table rate_card enable row level security;

create policy "own claims select" on claims for select using (auth.uid() = hospital_user_id);
create policy "own claims insert" on claims for insert with check (auth.uid() = hospital_user_id);
create policy "own claims update" on claims for update
  using (auth.uid() = hospital_user_id) with check (auth.uid() = hospital_user_id);
create policy "auth read policies" on policies for select using (auth.role() = 'authenticated');
create policy "auth read rate_card" on rate_card for select using (auth.role() = 'authenticated');
