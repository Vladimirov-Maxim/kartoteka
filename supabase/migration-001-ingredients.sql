-- ============================================================================
--  Миграция 001: состав становится структурным
--
--  Было:  ingredients text[]     — {"Спагетти 200 г", "Соль"}
--  Стало: ingredients jsonb      — [{"name":"Спагетти","qty":"200","unit":"г"}]
--
--  Запускать один раз, в SQL Editor проекта Supabase.
--  Старые строки не теряются: они превращаются в элементы массива как есть,
--  а приложение умеет читать обе формы. Разбор на «название / количество /
--  единица» происходит в момент, когда ты открываешь блюдо на редактирование.
-- ============================================================================

alter table public.dishes
  alter column ingredients drop default;

alter table public.dishes
  alter column ingredients type jsonb
  using to_jsonb(coalesce(ingredients, '{}'::text[]));

alter table public.dishes
  alter column ingredients set default '[]'::jsonb;

alter table public.dishes
  alter column ingredients set not null;

-- Проверка: должно вернуть блюда и их состав уже в виде json-массива.
-- select name, ingredients from public.dishes limit 5;
