-- Sredi.ba — payments, escrow, refunds and webhook idempotency
--
-- Implements the storage layer the payment routes now depend on:
--   Blueprint Ch.4   (schema, integer minor units, RLS on by default)
--   Blueprint Ch.8.4 (webhook idempotency via processed event ids)
--   Blueprint Ch.10.5 (the 8-state payment enum)
--   Blueprint Ch.10.8 (append-only financial audit trail)
--   Blueprint Ch.46  (invalid state transitions rejected at database level)
--
-- This migration is additive and backward compatible: nothing existing is
-- dropped or renamed, and every new column has a default that matches how the
-- app behaved before.
--
-- BEFORE RUNNING: this assumes jobs.id, applications.id and profiles.id are
-- uuid, which is the Supabase default. Verify with:
--   select table_name, column_name, data_type
--   from information_schema.columns
--   where table_name in ('jobs','applications','profiles') and column_name='id';
-- If any of them is bigint, change the matching column types below to match.

begin;

-- ---------------------------------------------------------------------------
-- 1. Profile columns for Stripe Connect eligibility and roles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists stripe_account_id text,
  add column if not exists stripe_connected boolean not null default false,
  -- Ch.8.3: a helper cannot be hired or paid until Stripe reports both true.
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false,
  add column if not exists is_blocked boolean not null default false,
  add column if not exists is_verified boolean not null default false,
  -- Ch.35.1: four admin tiers, not one flat admin flag. Null = not an admin.
  add column if not exists admin_role text;

alter table public.profiles
  drop constraint if exists profiles_admin_role_check;

alter table public.profiles
  add constraint profiles_admin_role_check
  check (
    admin_role is null
    or admin_role in ('support_agent', 'moderator', 'finance_admin', 'super_admin')
  );

create unique index if not exists profiles_stripe_account_id_key
  on public.profiles (stripe_account_id)
  where stripe_account_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Job columns
-- ---------------------------------------------------------------------------

alter table public.jobs
  -- Ch.10.1: payment_type is fixed at creation. Existing rows were all
  -- Secure Payment, so 'secure' is the correct backfill default.
  add column if not exists payment_type text not null default 'secure',
  add column if not exists assigned_at timestamptz;

alter table public.jobs
  drop constraint if exists jobs_payment_type_check;

alter table public.jobs
  add constraint jobs_payment_type_check
  check (payment_type in ('secure', 'cash'));

-- ---------------------------------------------------------------------------
-- 3. Applications: pending_payment state and the one-application-per-helper rule
-- ---------------------------------------------------------------------------

-- Ch.2.1: one application per helper per job. Without this, a retried
-- commitment-fee checkout could create duplicates.
create unique index if not exists applications_job_helper_key
  on public.applications (job_id, helper_id);

alter table public.applications
  drop constraint if exists applications_status_check;

-- 'pending_payment' is the Cash Payment holding state: the row exists so the
-- Stripe session can reference it, but it is not a visible application until
-- the commitment fee clears (Ch.9 step 3).
alter table public.applications
  add constraint applications_status_check
  check (
    status in (
      'pending_payment',
      'pending',
      'accepted',
      'rejected',
      'withdrawn',
      'expired'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Payments (Ch.10.5 — eight states, integer minor units)
-- ---------------------------------------------------------------------------

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  payer_id uuid references public.profiles (id) on delete set null,
  payee_id uuid references public.profiles (id) on delete set null,
  type text not null check (type in ('secure_payment', 'commitment_fee')),
  status text not null check (
    status in (
      'Pending',
      'Processing',
      'Succeeded',
      'Failed',
      'Cancelled',
      'Refunded',
      'Released',
      'Disputed'
    )
  ),
  currency text not null,
  -- Ch.4.1: integers in minor units, never floats.
  amount_minor integer not null,
  commission_minor integer not null default 0,
  -- The KM figure shown to the user, kept for receipts and dispute evidence.
  amount_km numeric(12, 2),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  paid_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_job_id_idx on public.payments (job_id);
create index if not exists payments_payer_id_idx on public.payments (payer_id);
create index if not exists payments_payee_id_idx on public.payments (payee_id);
create index if not exists payments_status_idx on public.payments (status);
create index if not exists payments_payment_intent_idx
  on public.payments (stripe_payment_intent_id);

-- ---------------------------------------------------------------------------
-- 5. Refunds (Ch.10.4 — automatic, and never silently dropped)
-- ---------------------------------------------------------------------------

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  amount_minor integer,
  reason text,
  initiated_by text not null default 'system'
    check (initiated_by in ('system', 'admin')),
  stripe_refund_id text,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists refunds_payment_id_idx on public.refunds (payment_id);

-- ---------------------------------------------------------------------------
-- 6. Webhook idempotency (Ch.8.4)
-- ---------------------------------------------------------------------------

-- The primary key is the Stripe event id, so a redelivered event collides on
-- insert and the handler short-circuits before touching any payment.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. Audit log (Ch.10.8 — append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_type text not null default 'user'
    check (actor_type in ('user', 'admin', 'system')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

-- Ch.10.8: these logs must never be editable, even by an admin.
create or replace function public.reject_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;

drop trigger if exists audit_logs_no_update on public.audit_logs;

create trigger audit_logs_no_update
  before update or delete on public.audit_logs
  for each row execute function public.reject_audit_log_mutation();

-- ---------------------------------------------------------------------------
-- 8. Database-level state-transition guards (Ch.46 / roadmap CRITICAL)
-- ---------------------------------------------------------------------------

-- App-level validation is bypassable via direct API access, so the illegal
-- transitions are rejected here as well.

create or replace function public.enforce_payment_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  -- Terminal states never move again.
  if old.status in ('Refunded', 'Released', 'Cancelled') then
    raise exception 'Invalid payment transition % -> %', old.status, new.status;
  end if;

  -- Money can only be released out of a cleared charge.
  if new.status = 'Released' and old.status <> 'Succeeded' then
    raise exception 'Payment can only be Released from Succeeded, not %', old.status;
  end if;

  if new.status = 'Succeeded'
     and old.status not in ('Pending', 'Processing') then
    raise exception 'Payment can only Succeed from Pending/Processing, not %', old.status;
  end if;

  return new;
end;
$$;

drop trigger if exists payments_transition_guard on public.payments;

create trigger payments_transition_guard
  before update of status on public.payments
  for each row execute function public.enforce_payment_transition();

create or replace function public.enforce_job_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  -- Ch.2.2: terminal job states.
  if old.status in ('completed', 'cancelled', 'expired', 'archived') then
    raise exception 'Job status % is terminal (attempted -> %)', old.status, new.status;
  end if;

  -- A job cannot jump straight from open to completed.
  if old.status = 'open' and new.status = 'completed' then
    raise exception 'Job cannot move directly from open to completed';
  end if;

  return new;
end;
$$;

drop trigger if exists jobs_transition_guard on public.jobs;

create trigger jobs_transition_guard
  before update of status on public.jobs
  for each row execute function public.enforce_job_transition();

create or replace function public.enforce_application_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status in ('rejected', 'withdrawn', 'expired') then
    raise exception 'Application status % is terminal (attempted -> %)',
      old.status, new.status;
  end if;

  if new.status = 'accepted' and old.status <> 'pending' then
    raise exception 'Only a pending application can be accepted, not %', old.status;
  end if;

  return new;
end;
$$;

drop trigger if exists applications_transition_guard on public.applications;

create trigger applications_transition_guard
  before update of status on public.applications
  for each row execute function public.enforce_application_transition();

-- ---------------------------------------------------------------------------
-- 9. Row Level Security (Ch.4.1 — on by default, access opt-in per policy)
-- ---------------------------------------------------------------------------

alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.stripe_events enable row level security;
alter table public.audit_logs enable row level security;

-- No policies are defined for stripe_events or audit_logs, so with RLS enabled
-- no client can read or write them at all. Only the service-role key used by
-- the API routes can, which is exactly the intent.

drop policy if exists payments_read_own on public.payments;

-- A user sees only payments they made or are the payee of. Card data is never
-- stored here (Ch.10.10) — only Stripe references.
create policy payments_read_own on public.payments
  for select
  using (auth.uid() = payer_id or auth.uid() = payee_id);

drop policy if exists refunds_read_own on public.refunds;

create policy refunds_read_own on public.refunds
  for select
  using (
    exists (
      select 1
      from public.payments p
      where p.id = refunds.payment_id
        and (auth.uid() = p.payer_id or auth.uid() = p.payee_id)
    )
  );

-- Writes to payments and refunds are intentionally service-role only: no
-- insert/update/delete policy exists, so clients cannot fabricate a payment.

-- ---------------------------------------------------------------------------
-- 10. updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payments_touch_updated_at on public.payments;

create trigger payments_touch_updated_at
  before update on public.payments
  for each row execute function public.touch_updated_at();

commit;
