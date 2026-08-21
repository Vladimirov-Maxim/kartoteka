-- ============================================================================
--  Миграция 003: чтобы удаления долетали до второго устройства
--
--  По умолчанию Postgres при удалении строки сообщает подписчикам только её id.
--  Наша подписка отбирает события по kitchen_id — а его в таком сообщении нет,
--  поэтому удаления молча отбрасывались: правки приходили, удаления нет.
--
--  REPLICA IDENTITY FULL заставляет присылать всю удалённую строку целиком.
--  Таблицы у нас крошечные, накладные расходы незаметны.
--
--  Запускать один раз, в SQL Editor проекта Supabase.
-- ============================================================================

alter table public.shopping_items replica identity full;
alter table public.cook_log       replica identity full;
alter table public.dishes         replica identity full;

-- Проверка: во всех трёх строках должно быть 'f' (full).
-- select relname, relreplident from pg_class
--  where relname in ('shopping_items','cook_log','dishes');
