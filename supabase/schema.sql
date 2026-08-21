-- ============================================================================
--  Кухонная картотека — схема базы
--  Вставь этот файл целиком в SQL Editor проекта Supabase и нажми Run.
--  Запускать можно повторно: всё написано так, чтобы не ломаться на второй раз.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- таблицы ---

-- кухня = общее пространство, в котором живут блюда
create table if not exists public.kitchens (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Наша кухня',
  join_code  text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- кто состоит в кухне
create table if not exists public.members (
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (kitchen_id, user_id)
);

-- блюда
create table if not exists public.dishes (
  id          uuid primary key default gen_random_uuid(),
  kitchen_id  uuid not null references public.kitchens(id) on delete cascade,
  name        text not null,
  categories  text[] not null default '{}',
  tags        text[] not null default '{}',
  minutes     integer not null default 0,
  ingredients text[] not null default '{}',
  recipe      text not null default '',
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists dishes_kitchen_idx on public.dishes (kitchen_id);

-- журнал готовки: только добавление, поэтому конфликтов не бывает в принципе.
-- «когда готовили последний раз» и «сколько раз всего» считаются отсюда.
create table if not exists public.cook_log (
  id         uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id) on delete cascade,
  dish_id    uuid not null references public.dishes(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  cooked_on  date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now()
);

create index if not exists cook_log_kitchen_idx on public.cook_log (kitchen_id);
create index if not exists cook_log_dish_idx    on public.cook_log (dish_id);

-- ------------------------------------------------- отметка времени правки ---

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists dishes_touch_updated_at on public.dishes;
create trigger dishes_touch_updated_at
  before update on public.dishes
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------- правила доступа ---
-- Главное место всей защиты. Строку видно, только если ты состоишь
-- в той же кухне. Проверка живёт здесь, а не в коде страницы,
-- поэтому её нельзя обойти, поправив JS в браузере.

alter table public.kitchens enable row level security;
alter table public.members  enable row level security;
alter table public.dishes   enable row level security;
alter table public.cook_log enable row level security;

-- members: каждый видит только свои членства (без рекурсии)
drop policy if exists members_select_own on public.members;
create policy members_select_own on public.members
  for select using (user_id = auth.uid());

drop policy if exists members_delete_own on public.members;
create policy members_delete_own on public.members
  for delete using (user_id = auth.uid());

-- kitchens: видно те, в которых состоишь
drop policy if exists kitchens_select_mine on public.kitchens;
create policy kitchens_select_mine on public.kitchens
  for select using (
    id in (select kitchen_id from public.members where user_id = auth.uid())
  );

drop policy if exists kitchens_update_mine on public.kitchens;
create policy kitchens_update_mine on public.kitchens
  for update using (
    id in (select kitchen_id from public.members where user_id = auth.uid())
  ) with check (
    id in (select kitchen_id from public.members where user_id = auth.uid())
  );

-- dishes: полный доступ участникам своей кухни
drop policy if exists dishes_select on public.dishes;
create policy dishes_select on public.dishes
  for select using (
    kitchen_id in (select kitchen_id from public.members where user_id = auth.uid())
  );

drop policy if exists dishes_insert on public.dishes;
create policy dishes_insert on public.dishes
  for insert with check (
    kitchen_id in (select kitchen_id from public.members where user_id = auth.uid())
  );

drop policy if exists dishes_update on public.dishes;
create policy dishes_update on public.dishes
  for update using (
    kitchen_id in (select kitchen_id from public.members where user_id = auth.uid())
  ) with check (
    kitchen_id in (select kitchen_id from public.members where user_id = auth.uid())
  );

drop policy if exists dishes_delete on public.dishes;
create policy dishes_delete on public.dishes
  for delete using (
    kitchen_id in (select kitchen_id from public.members where user_id = auth.uid())
  );

-- cook_log: читать может вся кухня, писать — от своего имени
drop policy if exists cook_log_select on public.cook_log;
create policy cook_log_select on public.cook_log
  for select using (
    kitchen_id in (select kitchen_id from public.members where user_id = auth.uid())
  );

drop policy if exists cook_log_insert on public.cook_log;
create policy cook_log_insert on public.cook_log
  for insert with check (
    user_id = auth.uid()
    and kitchen_id in (select kitchen_id from public.members where user_id = auth.uid())
  );

drop policy if exists cook_log_delete on public.cook_log;
create policy cook_log_delete on public.cook_log
  for delete using (
    kitchen_id in (select kitchen_id from public.members where user_id = auth.uid())
  );

-- ----------------------------------------------- создание и вход по коду ---
-- Обе функции выполняются с правами владельца: иначе второй человек
-- не смог бы найти кухню по коду — он её ещё не видит.

create or replace function public.create_kitchen(p_name text default null)
returns public.kitchens
language plpgsql security definer set search_path = public
as $$
declare
  k public.kitchens;
  c text;
begin
  if auth.uid() is null then
    raise exception 'Нужно войти';
  end if;

  loop
    c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.kitchens where join_code = c);
  end loop;

  insert into public.kitchens (name, join_code, created_by)
  values (coalesce(nullif(btrim(p_name), ''), 'Наша кухня'), c, auth.uid())
  returning * into k;

  insert into public.members (kitchen_id, user_id) values (k.id, auth.uid());
  return k;
end $$;

create or replace function public.join_kitchen(p_code text)
returns public.kitchens
language plpgsql security definer set search_path = public
as $$
declare k public.kitchens;
begin
  if auth.uid() is null then
    raise exception 'Нужно войти';
  end if;

  select * into k from public.kitchens
   where join_code = upper(btrim(p_code));

  if k.id is null then
    raise exception 'Кухня с таким кодом не найдена';
  end if;

  insert into public.members (kitchen_id, user_id)
  values (k.id, auth.uid())
  on conflict do nothing;

  return k;
end $$;

revoke all on function public.create_kitchen(text) from public;
revoke all on function public.join_kitchen(text)   from public;
grant execute on function public.create_kitchen(text) to authenticated;
grant execute on function public.join_kitchen(text)   to authenticated;

-- ------------------------------------------------------------- realtime ---
-- Чтобы правки второго человека прилетали сами, без опроса.

do $$
begin
  begin
    alter publication supabase_realtime add table public.dishes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.cook_log;
  exception when duplicate_object then null;
  end;
end $$;

-- Готово.
