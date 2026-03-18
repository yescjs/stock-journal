-- Create trade_templates table for saved trade templates (Feature: 거래 템플릿)
create table if not exists public.trade_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  symbol text not null,
  symbol_name text,
  side text not null check (side in ('BUY', 'SELL')),
  quantity numeric not null,
  created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.trade_templates enable row level security;

-- Users can only access their own templates
create policy "Users can manage own templates"
  on public.trade_templates
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
