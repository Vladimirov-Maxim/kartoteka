-- ============================================================================
--  Миграция 002: список покупок
--
--  Одна строка = один продукт в списке: «Лук, 3, шт».
--  Добавили блюдо — его состав вливается сюда, повторы складываются.
--  Список общий на кухню, галочки видны обоим сразу.
--
--  Запускать один раз, в SQL Editor проекта Supabase.
-- ============================================================================

create table if not exists public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  name       text not null,
  qty        text not null default '',
  unit       text not null default '',
  sources    text[] not null default '{}',   -- из каких блюд пришло
  checked    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shopping_kitchen_idx on public.shopping_items (kitchen_id);

drop trigger if exists shopping_touch_updated_at on public.shopping_items;
create trigger shopping_touch_updated_at
  before update on public.shopping_items
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------- правила доступа ---

alter table public.shopping_items enable row level security;

drop policy if exists shopping_select on public.shopping_items;
create policy shopping_select on public.shopping_items
  for select using (
    kitchen_id in (select kitchen_id from public.members where user_id = auth.uid())
  );

drop policy if exists shopping_insert on public.shopping_items;
create policy shopping_insert on public.shopping_items
  for insert with check (
    kitchen_id in (select kitchen_id from public.members where user_id = auth.uid())
  );

drop policy if exists shopping_update on public.shopping_items;
create policy shopping_update on public.shopping_items
  for update using (
    kitchen_id in (select kitchen_id from public.members where user_id = auth.uid())
  ) with check (
    kitchen_id in (select kitchen_id from public.members where user_id = auth.uid())
  );

drop policy if exists shopping_delete on public.shopping_items;
create policy shopping_delete on public.shopping_items
  for delete using (
    kitchen_id in (select kitchen_id from public.members where user_id = auth.uid())
  );

-- ------------------------------------------------------------- realtime ---

do $$
begin
  begin
    alter publication supabase_realtime add table public.shopping_items;
  exception when duplicate_object then null;
  end;
end $$;

-- Готово.
