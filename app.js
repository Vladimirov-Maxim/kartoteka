/* ============================================================================
   Кухонная картотека
   ---------------------------------------------------------------------------
   Данные живут в Supabase (общая база на всю кухню) и дублируются в браузере,
   чтобы приложение открывалось мгновенно и работало без сети.

   Фильтры, поиск и колода считаются локально по массиву в памяти —
   в базу ходим только за первой загрузкой, за записью и за чужими правками.
   ========================================================================== */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

/* ============================== константы ============================== */

const CATS = ["Завтрак","Обед","Ужин","Перекус","Десерт","Напиток"];
const CAT_VAR = {"Завтрак":"--c-zavtrak","Обед":"--c-obed","Ужин":"--c-uzhin",
                 "Перекус":"--c-perekus","Десерт":"--c-desert","Напиток":"--c-napitok"};
const catColor  = c => `var(${CAT_VAR[c] || "--c-other"})`;
const dishCats  = d => (d.categories && d.categories.length ? d.categories : ["Ужин"]);
const dishColor = d => catColor(dishCats(d)[0]);

// Единицы для выпадающего списка. Список не закрытый — своё тоже можно вписать.
const UNITS = ["г","кг","мл","л","шт","ст. л.","ч. л.","стакан","щепотка",
               "зубчик","пучок","банка","упак.","по вкусу"];

const SEED = [
  {name:"Паста карбонара",categories:["Ужин"],tags:["быстро","мясное"],minutes:25,
   ingredients:["Спагетти 200 г","Гуанчиале или бекон 120 г","Яичные желтки 3 шт","Пекорино 50 г","Чёрный перец","Соль"],
   recipe:"1. Поставить воду для пасты, посолить.\n2. Бекон нарезать брусочками, вытопить на сухой сковороде до румяности.\n3. Желтки взбить с тёртым сыром и щедрой порцией перца.\n4. Пасту сварить al dente, оставить полстакана воды.\n5. Снять сковороду с огня, добавить пасту, влить желтки и разбавлять водой от пасты до кремовой текстуры.\n6. Подавать сразу, сверху ещё сыр и перец."},
  {name:"Борщ",categories:["Обед"],tags:["суп","надолго"],minutes:120,
   ingredients:["Говядина на кости 600 г","Свёкла 2 шт","Капуста 300 г","Картофель 3 шт","Морковь 1 шт","Лук 1 шт","Томатная паста 2 ст. л.","Чеснок","Лавровый лист","Сметана"],
   recipe:"1. Сварить бульон на говядине — полтора часа на тихом огне.\n2. Свёклу натереть и тушить с томатной пастой и ложкой уксуса: так цвет останется бордовым.\n3. Лук и морковь спассеровать.\n4. В бульон отправить картофель, через 10 минут капусту, затем зажарку и свёклу.\n5. Доварить 10 минут, добавить чеснок и лавровый лист, дать настояться час.\n6. Подавать со сметаной."},
  {name:"Шакшука",categories:["Завтрак"],tags:["быстро","вегетарианское"],minutes:20,
   ingredients:["Яйца 4 шт","Помидоры в собственном соку 400 г","Болгарский перец 1 шт","Лук 1 шт","Чеснок 2 зубчика","Паприка","Зира","Зелень","Оливковое масло"],
   recipe:"1. Лук и перец обжарить на оливковом масле до мягкости.\n2. Добавить чеснок, паприку и зиру, прогреть полминуты.\n3. Влить помидоры, размять, уваривать 10 минут до густоты.\n4. Сделать лунки, вбить яйца, накрыть крышкой на 5–6 минут.\n5. Посыпать зеленью, подавать с хлебом."},
  {name:"Плов",categories:["Ужин"],tags:["мясное","надолго"],minutes:90,
   ingredients:["Рис девзира 500 г","Баранина 600 г","Морковь 500 г","Лук 2 шт","Чеснок 2 головки","Зира","Барбарис","Растительное масло"],
   recipe:"1. Рис промыть до прозрачной воды, замочить в тёплой подсоленной.\n2. В казане раскалить масло, обжарить мясо до корочки.\n3. Лук полукольцами — до золотого, морковь соломкой — 10 минут.\n4. Залить кипятком, добавить зиру и барбарис, варить зирвак 40 минут.\n5. Выложить рис, залить водой на полтора сантиметра, выпарить на сильном огне.\n6. Собрать горкой, воткнуть чеснок, накрыть и томить 20 минут."},
  {name:"Овсянка с бананом",categories:["Завтрак"],tags:["быстро","вегетарианское"],minutes:10,
   ingredients:["Овсяные хлопья 60 г","Молоко 200 мл","Банан 1 шт","Мёд 1 ч. л.","Корица","Щепотка соли"],
   recipe:"1. Хлопья залить молоком, посолить, довести до кипения.\n2. Варить 5 минут, помешивая.\n3. Снять с огня, дать постоять пару минут под крышкой.\n4. Добавить нарезанный банан, мёд и корицу."},
  {name:"Курица терияки с рисом",categories:["Ужин"],tags:["быстро","мясное"],minutes:30,
   ingredients:["Куриное бедро 500 г","Соевый соус 4 ст. л.","Мирин или белое вино 2 ст. л.","Сахар 1 ст. л.","Имбирь","Рис 200 г","Кунжут","Зелёный лук"],
   recipe:"1. Рис поставить вариться.\n2. Бедро нарезать кусками, обжарить кожей вниз до корочки.\n3. Смешать соус, мирин, сахар и тёртый имбирь, влить в сковороду.\n4. Уваривать 5–7 минут, пока соус не станет глянцевым и не обволочёт курицу.\n5. Подавать на рисе, посыпав кунжутом и зелёным луком."},
  {name:"Салат с киноа и нутом",categories:["Обед","Ужин"],tags:["вегетарианское","быстро","полезное"],minutes:25,
   ingredients:["Киноа 150 г","Нут отварной 200 г","Огурец 1 шт","Помидоры черри 150 г","Фета 100 г","Лимон","Оливковое масло","Мята","Петрушка"],
   recipe:"1. Киноа отварить 12–15 минут, откинуть и остудить.\n2. Овощи нарезать, зелень порубить.\n3. Заправка: сок лимона, оливковое масло, соль, перец.\n4. Всё смешать, сверху раскрошить фету."},
  {name:"Сырники",categories:["Завтрак","Десерт"],tags:["вегетарианское"],minutes:30,
   ingredients:["Творог 9% 500 г","Яйцо 1 шт","Мука 3 ст. л.","Сахар 2 ст. л.","Ванилин","Соль","Масло для жарки","Сметана"],
   recipe:"1. Творог протереть через сито — тогда сырники будут нежными.\n2. Смешать с яйцом, сахаром, ванилином и солью.\n3. Добавить муку, замесить мягкое тесто, дать постоять 10 минут.\n4. Сформовать шайбочки, обвалять в муке.\n5. Жарить на среднем огне под крышкой по 3–4 минуты с каждой стороны."}
];

/* =============================== утилиты =============================== */

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID()
  : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    }));

function plural(n, a, b, c){
  n = Math.abs(n);
  if (n % 100 >= 11 && n % 100 <= 14) return c;
  if (n % 10 === 1) return a;
  if (n % 10 >= 2 && n % 10 <= 4) return b;
  return c;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

function daysSince(iso){
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return null;
  return Math.floor((new Date(today() + "T00:00:00") - d) / 864e5);
}

function lastCookedText(dish){
  const n = daysSince(dish.lastCooked);
  if (n === null) return "ещё ни разу";
  if (n <= 0) return "готовили сегодня";
  if (n === 1) return "готовили вчера";
  if (n < 30) return `готовили ${n} ${plural(n,"день","дня","дней")} назад`;
  const m = Math.floor(n / 30);
  if (m < 12) return `готовили ${m} ${plural(m,"месяц","месяца","месяцев")} назад`;
  const y = Math.floor(n / 365);
  return `готовили ${y} ${plural(y,"год","года","лет")} назад`;
}

/* ------------------------------ состав блюда ------------------------------
   Ингредиент — это {name, qty, unit}. Количество храним строкой, чтобы
   можно было написать «1/2» или «2–3»: для показа этого достаточно, а для
   будущего списка покупок число всегда можно вынуть.                        */

// Разбирает старую запись одной строкой: «Спагетти 200 г» → три поля.
// Число ищем последнее в строке, а хвост после него принимаем за единицу,
// только если он похож на единицу: короткий и из букв. Иначе не трогаем.
function parseIng(str){
  const s = String(str).trim();
  const m = s.match(/^(.*\S)\s+(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*([а-яёa-z.\s]{0,12})$/i);
  if (!m) return { name: s, qty: "", unit: "" };
  return {
    name: m[1].trim(),
    qty:  m[2].replace(",", ".").replace(/\s+/g, ""),
    unit: m[3].trim().replace(/\s+/g, " ")
  };
}

function normIng(x){
  if (x == null) return null;
  if (typeof x === "string"){
    const s = x.trim();
    return s ? parseIng(s) : null;
  }
  const name = String(x.name ?? "").trim();
  const qty  = String(x.qty  ?? "").trim();
  const unit = String(x.unit ?? "").trim();
  if (!name && !qty && !unit) return null;
  return { name, qty, unit };
}

// «Спагетти 200 г», «Соль по вкусу», «Петрушка»
const ingText = i => [i.name, i.qty, i.unit]
  .map(v => (v == null ? "" : String(v).trim()))
  .filter(Boolean).join(" ");

function normalize(d){
  let cats = Array.isArray(d.categories) ? d.categories.filter(Boolean).map(String) : null;
  if (!cats || !cats.length) cats = [d.category || "Ужин"];
  return {
    id: d.id || uid(),
    name: String(d.name || "").trim(),
    categories: [...new Set(cats)],
    tags: Array.isArray(d.tags) ? d.tags.filter(Boolean).map(String) : [],
    minutes: Number(d.minutes) || 0,
    ingredients: Array.isArray(d.ingredients) ? d.ingredients.map(normIng).filter(Boolean) : [],
    recipe: String(d.recipe || ""),
    deleted: !!d.deleted,
    updated: Number(d.updated) || Date.now(),
    lastCooked: d.lastCooked || null,
    cookCount: Number(d.cookCount) || 0,
    history: []
  };
}

/* ============================== состояние ============================== */

let sb = null;              // клиент Supabase или null
let session = null;         // текущая сессия
let kitchen = null;         // {id, name, join_code}
let mode = "local";         // local | cloud
let channel = null;

const DB   = { dishes: [] };
let cookLog = [];           // {id, dish_id, user_id, cooked_on}
let queue  = [];            // неотправленные операции
let flushTimer = null, flushing = false;

const ui = {
  screen: "deck",
  cat: null,
  q: "",
  tags: new Set(),
  tagsOpen: false,
  stale: false,
  staleDays: 7,
  deck: [],
  current: null,
  fromList: false,
  keepCurrent: false,
  editing: null,
  formCats: new Set()
};

const live = () => DB.dishes.filter(d => !d.deleted);

/* ============================ локальный кэш ============================ */

const cacheKey = () => "kartoteka:" + (kitchen ? kitchen.id : "local");
const QUEUE_KEY = () => cacheKey() + ":queue";

function saveCache(){
  try {
    localStorage.setItem(cacheKey(), JSON.stringify({ dishes: DB.dishes, cookLog }));
    localStorage.setItem(QUEUE_KEY(), JSON.stringify(queue));
  } catch(e){ /* приватный режим или переполнение — не критично */ }
}

function loadCache(){
  try {
    const raw = localStorage.getItem(cacheKey());
    if (raw){
      const j = JSON.parse(raw);
      DB.dishes = (j.dishes || []).map(normalize);
      cookLog = j.cookLog || [];
    }
    queue = JSON.parse(localStorage.getItem(QUEUE_KEY()) || "[]");
  } catch(e){ DB.dishes = []; cookLog = []; queue = []; }
}

/* ======================= пересчёт истории готовки ======================= */

function recomputeCookStats(){
  const byDish = new Map();
  for (const ev of cookLog){
    if (!byDish.has(ev.dish_id)) byDish.set(ev.dish_id, []);
    byDish.get(ev.dish_id).push(ev);
  }
  for (const d of DB.dishes){
    const evs = (byDish.get(d.id) || []).sort((a,b) => b.cooked_on.localeCompare(a.cooked_on));
    d.cookCount = evs.length;
    d.lastCooked = evs.length ? evs[0].cooked_on : null;
    d.history = evs.slice(0, 5);
  }
}

/* ============================ сетевой слой ============================ */

const rowToDish = r => normalize({
  id: r.id, name: r.name, categories: r.categories, tags: r.tags,
  minutes: r.minutes, ingredients: r.ingredients, recipe: r.recipe,
  deleted: r.deleted, updated: Date.parse(r.updated_at) || Date.now()
});

const dishToRow = d => ({
  id: d.id, kitchen_id: kitchen.id, name: d.name,
  categories: d.categories, tags: d.tags, minutes: d.minutes,
  ingredients: d.ingredients, recipe: d.recipe, deleted: d.deleted
});

const SYNC_TITLE = {
  saved:  "Всё сохранено в общей базе",
  saving: "Отправляю изменения…",
  offline:"Нет связи с базой — правки отправятся, когда сеть вернётся",
  local:  "Локальный режим: база живёт только в этом браузере"
};

function setSync(state, text){
  const box = $("sync");
  if (!box) return;
  box.dataset.state = state;
  box.title = SYNC_TITLE[state] || "";
  $("syncText").textContent = text;
}

// Статус — производная от состояния, а не набор ручных присваиваний:
// так он не может застрять в промежуточном значении из-за гонки.
function refreshSync(){
  if (mode !== "cloud") return setSync("local", "локально");
  if (!navigator.onLine) return setSync("offline", "нет связи");
  if (queue.length || flushing) return setSync("saving", "сохраняю…");
  setSync("saved", "синхронизировано");
}

function enqueue(op){
  // одна операция на блюдо — незачем слать промежуточные состояния
  if (op.kind === "dish") queue = queue.filter(q => !(q.kind === "dish" && q.id === op.id));
  queue.push(op);
  saveCache();
  refreshSync();
  if (mode !== "cloud") return;
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 400);
}

async function flush(){
  if (mode !== "cloud" || flushing || !queue.length) return;
  if (!navigator.onLine){ refreshSync(); return; }
  flushing = true;
  refreshSync();
  try {
    while (queue.length){
      const op = queue[0];
      if (op.kind === "dish"){
        const d = DB.dishes.find(x => x.id === op.id);
        if (d){
          const { error } = await sb.from("dishes").upsert(dishToRow(d));
          if (error) throw error;
        }
      } else if (op.kind === "cook"){
        const { error } = await sb.from("cook_log").insert(op.row);
        if (error && error.code !== "23505") throw error;
      } else if (op.kind === "uncook"){
        const { error } = await sb.from("cook_log").delete().eq("dish_id", op.dishId);
        if (error) throw error;
      }
      queue.shift();
      saveCache();
    }
  } catch(err){
    console.warn("не удалось отправить:", err);
    setTimeout(flush, 8000);
  } finally {
    flushing = false;
    refreshSync();
  }
}

async function pullAll(){
  const [{ data: dRows, error: e1 }, { data: cRows, error: e2 }] = await Promise.all([
    sb.from("dishes").select("*").eq("kitchen_id", kitchen.id),
    sb.from("cook_log").select("*").eq("kitchen_id", kitchen.id)
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  // сервер — источник правды, но локальные неотправленные правки не теряем
  const pendingIds = new Set(queue.filter(q => q.kind === "dish").map(q => q.id));
  const local = new Map(DB.dishes.map(d => [d.id, d]));
  DB.dishes = dRows.map(rowToDish).map(d => pendingIds.has(d.id) ? local.get(d.id) : d);
  for (const id of pendingIds) if (!DB.dishes.find(d => d.id === id) && local.get(id))
    DB.dishes.push(local.get(id));

  cookLog = cRows.map(r => ({ id: r.id, dish_id: r.dish_id, user_id: r.user_id, cooked_on: r.cooked_on }));
  recomputeCookStats();
  saveCache();
}

function subscribe(){
  if (channel) sb.removeChannel(channel);
  channel = sb.channel("kitchen:" + kitchen.id)
    .on("postgres_changes",
        { event: "*", schema: "public", table: "dishes", filter: "kitchen_id=eq." + kitchen.id },
        p => {
          if (p.eventType === "DELETE"){
            DB.dishes = DB.dishes.filter(d => d.id !== p.old.id);
          } else {
            const incoming = rowToDish(p.new);
            const i = DB.dishes.findIndex(d => d.id === incoming.id);
            if (i === -1) DB.dishes.push(incoming);
            else if (!queue.some(q => q.kind === "dish" && q.id === incoming.id)) DB.dishes[i] = incoming;
          }
          recomputeCookStats(); saveCache(); rerender();
        })
    .on("postgres_changes",
        { event: "*", schema: "public", table: "cook_log", filter: "kitchen_id=eq." + kitchen.id },
        p => {
          if (p.eventType === "DELETE") cookLog = cookLog.filter(e => e.id !== p.old.id);
          else if (!cookLog.some(e => e.id === p.new.id))
            cookLog.push({ id: p.new.id, dish_id: p.new.dish_id, user_id: p.new.user_id, cooked_on: p.new.cooked_on });
          recomputeCookStats(); saveCache(); rerender();
        })
    .subscribe();
}

function rerender(){
  updateCount();
  if (ui.screen === "list") renderList();
  if (ui.screen === "deck" && ui.current){
    const fresh = DB.dishes.find(d => d.id === ui.current.id && !d.deleted);
    if (!fresh) { nextCard(); return; }
    ui.current = fresh;
    renderStage();
  }
  if (ui.screen === "recipe" && ui.current){
    const fresh = DB.dishes.find(d => d.id === ui.current.id);
    if (fresh) openRecipe(fresh, ui.fromList);
  }
}

/* ====================== изменения данных из интерфейса ====================== */

function markChanged(dish){
  dish.updated = Date.now();
  saveCache();
  if (mode === "cloud") enqueue({ kind: "dish", id: dish.id });
  else refreshSync();
}

function addCookEvent(dish){
  const ev = {
    id: uid(), dish_id: dish.id, cooked_on: today(),
    user_id: session ? session.user.id : null
  };
  cookLog.push(ev);
  recomputeCookStats();
  saveCache();
  if (mode === "cloud") enqueue({ kind: "cook", row: { ...ev, kitchen_id: kitchen.id } });
  else refreshSync();
}

function clearCookHistory(dish){
  cookLog = cookLog.filter(e => e.dish_id !== dish.id);
  recomputeCookStats();
  saveCache();
  if (mode === "cloud") enqueue({ kind: "uncook", dishId: dish.id });
}

/* ============================ экран: колода ============================ */

function allTags(){
  const s = new Set();
  live().forEach(d => d.tags.forEach(t => s.add(t)));
  return [...s].sort((a,b) => a.localeCompare(b,"ru"));
}

function renderFilters(){
  const cc = $("catChips");
  cc.textContent = "";
  const cats = [...new Set(live().flatMap(dishCats))].sort((a,b) => a.localeCompare(b,"ru"));
  const mkChip = (label, active, onClick, extraCls) => {
    const b = el("button", "chip" + (extraCls ? " " + extraCls : ""), label);
    b.setAttribute("aria-pressed", String(active));
    b.addEventListener("click", onClick);
    return b;
  };
  cc.append(mkChip("Любая", ui.cat === null, () => { ui.cat = null; rebuildDeck(); }));
  cats.forEach(c => cc.append(mkChip(c, ui.cat === c, () => { ui.cat = ui.cat === c ? null : c; rebuildDeck(); })));

  const tags = allTags();
  const tc = $("tagChips");
  tc.textContent = "";
  if (tags.length){
    const more = el("button","chip more", ui.tags.size ? `теги · ${ui.tags.size}` : "+ теги");
    more.dataset.open = String(ui.tagsOpen);
    more.dataset.active = String(ui.tags.size > 0);
    more.setAttribute("aria-expanded", String(ui.tagsOpen));
    more.addEventListener("click", () => { ui.tagsOpen = !ui.tagsOpen; renderFilters(); });
    cc.append(more);

    tags.forEach(t => tc.append(mkChip(t, ui.tags.has(t), () => {
      ui.tags.has(t) ? ui.tags.delete(t) : ui.tags.add(t);
      rebuildDeck();
    }, "tag")));
    if (ui.tags.size){
      const clear = el("button","chip clear","сбросить");
      clear.addEventListener("click", () => { ui.tags.clear(); rebuildDeck(); });
      tc.append(clear);
    }
  }
  tc.hidden = !tags.length || !ui.tagsOpen;

  $("staleToggle").dataset.on = String(ui.stale);
  $("staleToggle").setAttribute("aria-pressed", String(ui.stale));
  $("staleDays").value = ui.staleDays;
}

function matchesText(d, q){
  if (!q) return true;
  return d.name.toLowerCase().includes(q)
      || d.tags.some(t => t.toLowerCase().includes(q))
      || dishCats(d).some(c => c.toLowerCase().includes(q))
      || d.ingredients.some(i => ingText(i).toLowerCase().includes(q));
}

function filtered(){
  const q = ui.q.trim().toLowerCase();
  return live().filter(d => {
    if (!matchesText(d, q)) return false;
    if (ui.cat && !dishCats(d).includes(ui.cat)) return false;
    for (const t of ui.tags) if (!d.tags.includes(t)) return false;
    if (ui.stale){
      const n = daysSince(d.lastCooked);
      if (n !== null && n < ui.staleDays) return false;
    }
    return true;
  });
}

function resetFilters(){
  ui.cat = null; ui.tags.clear(); ui.stale = false; ui.q = "";
  const s = $("deckSearch");
  if (s) s.value = "";
  rebuildDeck();
}

function updateCount(){
  const total = filtered().length;
  const left = ui.deck.length + (ui.current ? 1 : 0);
  $("count").textContent = `подходит: ${total} · в колоде: ${left}`;
}

function rebuildDeck(){
  renderFilters();
  const pool = filtered();
  for (let i = pool.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  ui.deck = pool.map(d => d.id);
  ui.current = null;
  nextCard();
}

function nextCard(){
  while (ui.deck.length){
    const id = ui.deck.shift();
    const d = DB.dishes.find(x => x.id === id && !x.deleted);
    if (d){ ui.current = d; renderStage(); updateCount(); return; }
  }
  ui.current = null;
  renderStage();
  updateCount();
}

function cardNode(dish, depth){
  const c = el("div","card");
  c.dataset.depth = depth;
  c.dataset.id = dish.id;

  const tab = el("div","card-tab");
  tab.style.background = dishColor(dish);
  c.append(tab);

  const body = el("div","card-body");
  body.append(el("h2", null, dish.name));

  const meta = el("div","meta");
  dishCats(dish).forEach(cn => {
    const cat = el("span","pill cat", cn);
    cat.style.background = catColor(cn);
    meta.append(cat);
  });
  if (dish.minutes) meta.append(el("span","pill time", dish.minutes + " мин"));
  dish.tags.slice(0,3).forEach(t => meta.append(el("span","pill tag", t)));
  body.append(meta);

  const ings = el("div","ings");
  ings.append(el("div","label","Состав"));
  const ul = el("ul");
  const shown = dish.ingredients.slice(0,7);
  shown.forEach(i => ul.append(el("li", null, ingText(i))));
  if (dish.ingredients.length > shown.length)
    ul.append(el("li", null, `и ещё ${dish.ingredients.length - shown.length}`));
  if (!dish.ingredients.length) ul.append(el("li", null, "состав не записан"));
  ings.append(ul);
  body.append(ings);

  body.append(el("div","card-foot", lastCookedText(dish)));
  c.append(body);

  c.append(el("div","stamp cook","Готовлю"));
  c.append(el("div","stamp skip","Дальше"));
  return c;
}

function renderStage(){
  const stage = $("stage");
  stage.textContent = "";

  if (!ui.current){
    const any = filtered().length > 0;
    const filtersOn = !!(ui.cat || ui.tags.size || ui.stale || ui.q.trim());
    const box = el("div","empty");
    box.append(el("h3", null, any ? "Колода кончилась" : "Ничего не подошло"));
    box.append(el("p", null, any
      ? "Перемешать и пройтись заново — вдруг на этот раз что-то зацепит."
      : filtersOn
        ? "Слишком узкие фильтры: под них не попало ни одно блюдо."
        : "В картотеке пока пусто — добавь первое блюдо."));
    const mk = (text, cls, fn) => {
      const b = el("button", "act " + cls, text);
      b.style.flex = "none"; b.style.padding = "12px 22px";
      b.addEventListener("click", fn);
      return b;
    };
    if (any) box.append(mk("Перемешать","cook", rebuildDeck));
    else if (filtersOn) box.append(mk("Сбросить фильтры","cook", resetFilters));
    else box.append(mk("Добавить блюдо","cook", () => openSheet(null)));
    stage.append(box);
    $("btnCook").disabled = $("btnSkip").disabled = true;
    return;
  }
  $("btnCook").disabled = $("btnSkip").disabled = false;

  const upcoming = ui.deck.slice(0,2).map(id => DB.dishes.find(d => d.id === id)).filter(Boolean);
  upcoming.reverse().forEach((d,i) => stage.append(cardNode(d, upcoming.length - i)));
  const top = cardNode(ui.current, 0);
  stage.append(top);
  attachDrag(top);
}

/* --------------------------- перетаскивание --------------------------- */

const THRESHOLD = 95;
let flying = false;

function attachDrag(card){
  let startX = 0, startY = 0, dx = 0, axis = null, active = false;
  const cookStamp = card.querySelector(".stamp.cook");
  const skipStamp = card.querySelector(".stamp.skip");

  const paint = () => {
    const r = Math.max(-1, Math.min(1, dx / THRESHOLD));
    card.style.transform = `translateX(${dx}px) rotate(${dx * 0.045}deg)`;
    cookStamp.style.opacity = dx > 0 ? Math.min(1, r) : 0;
    skipStamp.style.opacity = dx < 0 ? Math.min(1, -r) : 0;
    card.style.borderColor = Math.abs(r) >= 1
      ? (dx > 0 ? "var(--hot)" : "var(--ink-3)") : "var(--line)";
  };

  card.addEventListener("pointerdown", e => {
    if (e.button) return;
    startX = e.clientX; startY = e.clientY; dx = 0; axis = null; active = true;
    card.classList.remove("settle");
  });
  card.addEventListener("pointermove", e => {
    if (!active) return;
    const mx = e.clientX - startX, my = e.clientY - startY;
    if (!axis){
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
      axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
      if (axis === "x") card.setPointerCapture(e.pointerId);
      else { active = false; return; }
    }
    dx = mx; paint();
  });
  const end = () => {
    if (!active) return;
    active = false;
    if (axis === null){                    // тап — просто посмотреть рецепт
      ui.keepCurrent = true;
      openRecipe(ui.current, false);
      return;
    }
    if (Math.abs(dx) >= THRESHOLD) fly(card, dx > 0 ? 1 : -1);
    else { card.classList.add("settle"); dx = 0; paint(); }
  };
  card.addEventListener("pointerup", end);
  card.addEventListener("pointercancel", end);
}

function fly(card, dir){
  if (flying) return;
  flying = true;
  ui.keepCurrent = false;
  const dish = ui.current;
  card.classList.remove("settle");
  card.classList.add("gone");
  card.style.transform = `translateX(${dir * 700}px) rotate(${dir * 22}deg)`;
  card.style.opacity = "0";
  card.querySelector(dir > 0 ? ".stamp.cook" : ".stamp.skip").style.opacity = "1";
  setTimeout(() => {
    flying = false;
    if (dir > 0) openRecipe(dish, false);
    else nextCard();
  }, 300);
}

function swipe(dir){
  if (ui.screen !== "deck" || !ui.current || flying) return;
  const top = $("stage").querySelector('.card[data-depth="0"]');
  if (top) fly(top, dir);
}

/* ============================ экран: рецепт ============================ */

function openRecipe(dish, fromList){
  ui.current = fromList ? dish : ui.current;
  ui.fromList = fromList;
  if (fromList) ui.keepCurrent = false;
  const s = $("screen-recipe");
  s.textContent = "";

  const back = el("button","back","‹ " + (fromList ? "к списку" : "к колоде"));
  back.addEventListener("click", () => backFromRecipe());
  s.append(back);

  s.append(el("h2", null, dish.name));

  const color = dishColor(dish);
  const meta = el("div","meta");
  dishCats(dish).forEach(cn => {
    const cat = el("span","pill cat", cn);
    cat.style.background = catColor(cn);
    meta.append(cat);
  });
  if (dish.minutes) meta.append(el("span","pill time", dish.minutes + " мин"));
  dish.tags.forEach(t => meta.append(el("span","pill tag", t)));
  s.append(meta);

  let stat = lastCookedText(dish);
  if (dish.cookCount) stat += ` · всего ${dish.cookCount} ${plural(dish.cookCount,"раз","раза","раз")}`;
  s.append(el("div","stat", stat));

  const p1 = el("div","panel");
  p1.append(el("div","label","Состав"));
  const ul = el("ul");
  (dish.ingredients.length ? dish.ingredients.map(ingText) : ["состав не записан"])
    .forEach(t => ul.append(el("li", null, t)));
  p1.append(ul);
  s.append(p1);

  const p2 = el("div","panel");
  p2.append(el("div","label","Как готовить"));
  p2.append(el("div","steps", dish.recipe || "Рецепт пока не записан — можно дописать через «Изменить»."));
  s.append(p2);

  if (dish.history && dish.history.length){
    const p3 = el("div","panel");
    p3.append(el("div","label","Когда готовили"));
    const box = el("div","history");
    dish.history.forEach(ev => {
      const row = el("div");
      row.append(el("b", null, ev.cooked_on));
      const who = !ev.user_id ? "" :
        (session && ev.user_id === session.user.id ? "я" : "напарник");
      if (who) row.append(el("span", null, who));
      box.append(row);
    });
    p3.append(box);
    s.append(p3);
  }

  const acts = el("div","recipe-actions");
  const cook = el("button","act cook","Готовить");
  cook.addEventListener("click", () => {
    addCookEvent(dish);
    toast(`«${dish.name}» — записал на сегодня`);
    if (ui.fromList){ renderList(); show("list"); }
    else { ui.keepCurrent = false; nextCard(); show("deck"); }
  });
  const edit = el("button","act ghost","Изменить");
  edit.addEventListener("click", () => openSheet(dish));
  const later = el("button","act ghost", ui.fromList ? "Назад" : "Не сегодня");
  later.addEventListener("click", () => backFromRecipe());
  acts.append(cook, edit, later);
  s.append(acts);

  show("recipe");
}

function backFromRecipe(){
  if (ui.fromList){ show("list"); return; }
  if (ui.keepCurrent){ ui.keepCurrent = false; renderStage(); show("deck"); return; }
  if (ui.current) ui.deck.push(ui.current.id);
  nextCard();
  show("deck");
}

/* ============================ экран: список ============================ */

function renderList(){
  const wrap = $("rows");
  wrap.textContent = "";
  const q = $("search").value.trim().toLowerCase();
  let items = live().slice().sort((a,b) => a.name.localeCompare(b.name,"ru"));
  if (q) items = items.filter(d => matchesText(d, q));

  if (!items.length)
    wrap.append(el("p","note", q ? "Ничего не нашлось." : "Пока пусто — добавь первое блюдо."));

  items.forEach(d => {
    const color = dishColor(d);
    const r = el("button","row");
    const bar = el("div","bar");
    bar.style.background = color;
    const txt = el("div","txt");
    txt.append(el("div","nm", d.name));
    const bits = [dishCats(d).join(" + ")];
    if (d.minutes) bits.push(d.minutes + " мин");
    bits.push(...d.tags);
    bits.push(lastCookedText(d));
    txt.append(el("div","sub", bits.join(" · ")));
    r.append(bar, txt, el("div","go","›"));
    r.addEventListener("click", () => openRecipe(d, true));
    wrap.append(r);
  });

  const n = live().length;
  $("invite").hidden = mode !== "cloud" || !kitchen;
  if (mode === "cloud" && kitchen) $("inviteCode").textContent = kitchen.join_code;
  $("storageNote").textContent = mode === "cloud"
    ? `${n} ${plural(n,"блюдо","блюда","блюд")} · кухня «${kitchen.name}» · база общая, изменения видны обоим сразу`
    : `${n} ${plural(n,"блюдо","блюда","блюд")} · база хранится только в этом браузере — скачай её, если чистишь историю`;
}

/* ============================ форма блюда ============================ */

/* ------------------------- состав: строки в форме ------------------------- */

function ingRow(ing){
  const row = el("div","ing-row");

  const name = el("input","ing-name");
  name.placeholder = "Ингредиент";
  name.value = ing ? ing.name : "";

  const qty = el("input","ing-qty");
  qty.placeholder = "кол.";
  qty.inputMode = "decimal";
  qty.value = ing ? ing.qty : "";

  const unit = el("input","ing-unit");
  unit.placeholder = "ед.";
  unit.setAttribute("list","unitList");
  unit.value = ing ? ing.unit : "";

  const del = el("button","ing-del","×");
  del.type = "button";
  del.title = "Убрать";
  del.addEventListener("click", () => { row.remove(); ensureIngRow(); });

  // Enter в названии — следующая строка, чтобы вбивать состав не отрываясь
  name.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const next = row.nextElementSibling;
    if (next) next.querySelector(".ing-name").focus();
    else addIngRow().querySelector(".ing-name").focus();
  });

  // вставка нескольких строк разом раскладывается по отдельным ингредиентам
  name.addEventListener("paste", e => {
    const text = (e.clipboardData || window.clipboardData).getData("text") || "";
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    const parsed = lines.map(parseIng);
    const first = parsed.shift();
    name.value = first.name;
    qty.value = first.qty;
    unit.value = first.unit;
    let after = row;
    parsed.forEach(p => { const r = ingRow(p); after.after(r); after = r; });
    ensureIngRow();
  });

  row.append(name, qty, unit, del);
  return row;
}

function addIngRow(ing){
  const row = ingRow(ing);
  $("fIngRows").append(row);
  return row;
}

// в форме всегда есть куда писать
function ensureIngRow(){
  if (!$("fIngRows").querySelector(".ing-row")) addIngRow();
}

function renderIngRows(list){
  const box = $("fIngRows");
  box.textContent = "";
  (list && list.length ? list : []).forEach(i => box.append(ingRow(i)));
  ensureIngRow();
}

function readIngRows(){
  return [...$("fIngRows").querySelectorAll(".ing-row")]
    .map(r => normIng({
      name: r.querySelector(".ing-name").value,
      qty:  r.querySelector(".ing-qty").value,
      unit: r.querySelector(".ing-unit").value
    }))
    .filter(Boolean);
}

function fillUnitList(){
  const dl = $("unitList");
  dl.textContent = "";
  // к стандартным добавляем те единицы, которые уже встречаются в базе
  const used = new Set(live().flatMap(d => d.ingredients.map(i => i.unit)).filter(Boolean));
  [...new Set([...UNITS, ...used])].forEach(u => {
    const o = document.createElement("option");
    o.value = u;
    dl.append(o);
  });
}

function renderCatPicker(){
  const box = $("fCats");
  box.textContent = "";
  const known = [...new Set([...CATS, ...live().flatMap(dishCats), ...ui.formCats])];
  known.forEach(c => {
    const chip = el("button","chip", c);
    const on = ui.formCats.has(c);
    chip.type = "button";
    chip.setAttribute("aria-pressed", String(on));
    if (on){ chip.style.background = catColor(c); chip.style.borderColor = catColor(c); chip.style.color = "#fff"; }
    chip.addEventListener("click", () => {
      ui.formCats.has(c) ? ui.formCats.delete(c) : ui.formCats.add(c);
      renderCatPicker();
    });
    box.append(chip);
  });
}

function openSheet(dish){
  ui.editing = dish;
  $("sheetTitle").textContent = dish ? "Изменить блюдо" : "Новое блюдо";
  ui.formCats = new Set(dish ? dishCats(dish) : ["Ужин"]);
  renderCatPicker();
  $("fCatNew").value = "";
  $("fName").value = dish ? dish.name : "";
  $("fMin").value  = dish && dish.minutes ? dish.minutes : "";
  $("fTags").value = dish ? dish.tags.join(", ") : "";
  fillUnitList();
  renderIngRows(dish ? dish.ingredients : []);
  $("fRec").value  = dish ? dish.recipe : "";
  $("fStat").textContent = "";
  if (dish){
    const s = el("span", null, lastCookedText(dish) + (dish.cookCount ? ` · всего ${dish.cookCount}` : ""));
    $("fStat").append(s);
    if (dish.cookCount){
      const r = el("button", null, "  сбросить историю");
      r.style.color = "var(--hot)";
      r.style.textDecoration = "underline";
      r.addEventListener("click", () => {
        clearCookHistory(dish);
        $("fStat").textContent = "ещё ни разу";
      });
      $("fStat").append(r);
    }
  }
  $("fDelete").hidden = !dish;
  $("sheet").hidden = false;
  document.body.style.overflow = "hidden";
  $("fName").focus();
}

function closeSheet(){
  $("sheet").hidden = true;
  document.body.style.overflow = "";
  ui.editing = null;
}

/* =============================== служебное =============================== */

function toast(msg){
  const t = el("div","toast",msg);
  $("toasts").append(t);
  setTimeout(() => t.remove(), 2600);
}

function show(screen){
  ui.screen = screen;
  $("screen-deck").hidden   = screen !== "deck";
  $("screen-recipe").hidden = screen !== "recipe";
  $("screen-list").hidden   = screen !== "list";
  document.querySelectorAll(".tabbar button").forEach(b =>
    b.setAttribute("aria-current", String(b.dataset.go === screen || (screen === "recipe" && b.dataset.go === "deck"))));
  try { window.scrollTo(0, 0); } catch(e){}
}

/* ============================== обработчики ============================== */

$("tabbar").addEventListener("click", e => {
  const b = e.target.closest("button[data-go]");
  if (!b) return;
  show(b.dataset.go);
  if (b.dataset.go === "list"){
    try { renderList(); } catch(err){ console.error(err); }
  }
});
$("deckSearch").addEventListener("input", e => { ui.q = e.target.value; rebuildDeck(); });
$("btnSkip").addEventListener("click", () => swipe(-1));
$("btnCook").addEventListener("click", () => swipe(1));
$("reshuffle").addEventListener("click", rebuildDeck);
$("btnAdd").addEventListener("click", () => openSheet(null));
$("search").addEventListener("input", renderList);
$("staleToggle").addEventListener("click", () => { ui.stale = !ui.stale; rebuildDeck(); });
$("staleDays").addEventListener("change", e => {
  ui.staleDays = Math.max(1, Math.min(365, Number(e.target.value) || 7));
  if (ui.stale) rebuildDeck(); else renderFilters();
});
$("sheetClose").addEventListener("click", closeSheet);
$("fIngAdd").addEventListener("click", () => addIngRow().querySelector(".ing-name").focus());

$("fCatNew").addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const v = e.target.value.trim();
  if (!v) return;
  ui.formCats.add(v);
  e.target.value = "";
  renderCatPicker();
});

$("fSave").addEventListener("click", () => {
  const name = $("fName").value.trim();
  if (!name){ toast("У блюда должно быть название"); $("fName").focus(); return; }
  const cats = [...ui.formCats];
  if (!cats.length) cats.push("Ужин");
  const data = {
    name, categories: cats,
    minutes: Number($("fMin").value) || 0,
    tags: $("fTags").value.split(",").map(s => s.trim()).filter(Boolean),
    ingredients: readIngRows(),
    recipe: $("fRec").value.trim()
  };
  let dish;
  if (ui.editing){ dish = Object.assign(ui.editing, data); }
  else { dish = normalize({ ...data, id: uid() }); DB.dishes.push(dish); }
  markChanged(dish);
  closeSheet();
  renderList(); renderFilters(); updateCount();
  toast(`Сохранено: «${name}»`);
});

$("fDelete").addEventListener("click", () => {
  const d = ui.editing;
  if (!d) return;
  d.deleted = true;
  markChanged(d);
  ui.deck = ui.deck.filter(id => id !== d.id);
  if (ui.current && ui.current.id === d.id) nextCard();
  closeSheet();
  renderList(); renderFilters(); updateCount();
  toast(`Удалено: «${d.name}»`);
});

$("btnSeed").addEventListener("click", () => {
  const have = new Set(live().map(d => d.name.toLowerCase()));
  let added = 0;
  SEED.forEach(s => {
    if (have.has(s.name.toLowerCase())) return;
    const d = normalize({ ...s, id: uid() });
    DB.dishes.push(d);
    markChanged(d);
    added++;
  });
  rebuildDeck(); renderList();
  toast(added ? `Добавлено ${added} ${plural(added,"блюдо","блюда","блюд")}` : "Примеры уже есть");
});

$("btnExport").addEventListener("click", () => {
  const payload = JSON.stringify({
    v: 2,
    dishes: live().map(({history, ...d}) => d),
    cookLog
  }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `kartoteka-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Файл сохранён");
});

$("btnImport").addEventListener("click", () => $("fileInput").click());
$("fileInput").addEventListener("change", async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    if (!j || !Array.isArray(j.dishes)) throw new Error("формат");
    const before = live().length;
    const byName = new Map(live().map(d => [d.name.toLowerCase(), d]));
    for (const raw of j.dishes){
      const inc = normalize(raw);
      const same = byName.get(inc.name.toLowerCase());
      if (same){
        if (inc.updated > same.updated){
          Object.assign(same, { ...inc, id: same.id });
          markChanged(same);
        }
      } else {
        const d = normalize({ ...inc, id: uid() });
        DB.dishes.push(d);
        markChanged(d);
      }
    }
    rebuildDeck(); renderList();
    toast(`Загружено. Было ${before}, стало ${live().length}`);
  } catch(err){
    console.error(err);
    toast("Не получилось прочитать файл — нужен JSON из «Скачать базу»");
  }
  e.target.value = "";
});

$("copyCode").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(kitchen.join_code); toast("Код скопирован"); }
  catch(e){ toast("Код: " + kitchen.join_code); }
});

document.addEventListener("keydown", e => {
  if ($("sheet").hidden === false){ if (e.key === "Escape") closeSheet(); return; }
  if (ui.screen === "recipe" && e.key === "Escape") backFromRecipe();
  if (ui.screen !== "deck") return;
  if (e.key === "ArrowLeft") swipe(-1);
  if (e.key === "ArrowRight") swipe(1);
});

window.addEventListener("online",  () => { refreshSync(); flush(); });
window.addEventListener("offline", () => refreshSync());

/* ============================= вход и кухня ============================= */

const gate = {
  show(which){
    $("gate").hidden = false;
    $("gate-auth").hidden    = which !== "auth";
    $("gate-kitchen").hidden = which !== "kitchen";
    $("gate-loading").hidden = which !== "loading";
  },
  hide(){ $("gate").hidden = true; }
};

let authMode = "in";  // in | up

function setAuthMode(m){
  authMode = m;
  $("authTitle").textContent = m === "in" ? "Вход" : "Регистрация";
  $("authGo").textContent    = m === "in" ? "Войти" : "Зарегистрироваться";
  $("authSwitchText").textContent = m === "in" ? "Ещё нет аккаунта?" : "Уже регистрировался?";
  $("authSwitch").textContent     = m === "in" ? "Зарегистрироваться" : "Войти";
  $("authPass").autocomplete = m === "in" ? "current-password" : "new-password";
  $("authErr").hidden = $("authOk").hidden = true;
}

$("authSwitch").addEventListener("click", () => setAuthMode(authMode === "in" ? "up" : "in"));

const AUTH_ERRORS = {
  "Invalid login credentials": "Неверная почта или пароль.",
  "User already registered": "Такая почта уже зарегистрирована — переключись на «Войти».",
  "Password should be at least 6 characters": "Пароль должен быть не короче 6 символов.",
  "Email not confirmed": "Почта не подтверждена. Загляни в ящик или выключи подтверждение в Supabase → Authentication → Sign In / Providers."
};

$("authGo").addEventListener("click", async () => {
  const email = $("authEmail").value.trim();
  const password = $("authPass").value;
  $("authErr").hidden = $("authOk").hidden = true;
  if (!email || !password){ showAuthErr("Заполни почту и пароль."); return; }
  $("authGo").disabled = true;
  try {
    if (authMode === "up"){
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session){
        $("authOk").hidden = false;
        $("authOk").textContent = "Аккаунт создан. Подтверди почту по ссылке из письма и возвращайся — или выключи подтверждение в Supabase → Authentication → Sign In / Providers → Confirm email.";
        return;
      }
      session = data.session;
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      session = data.session;
    }
    await afterSignIn();
  } catch(err){
    showAuthErr(AUTH_ERRORS[err.message] || ("Не получилось: " + err.message));
  } finally { $("authGo").disabled = false; }
});

function showAuthErr(text){
  $("authErr").hidden = false;
  $("authErr").textContent = text;
}

$("goOffline").addEventListener("click", () => startLocal());

$("kitchenCreate").addEventListener("click", async () => {
  $("kitchenErr").hidden = true;
  $("kitchenCreate").disabled = true;
  try {
    const { data, error } = await sb.rpc("create_kitchen", { p_name: $("kitchenName").value.trim() });
    if (error) throw error;
    await useKitchen(data);
  } catch(err){
    $("kitchenErr").hidden = false;
    $("kitchenErr").textContent = "Не получилось создать кухню: " + err.message;
  } finally { $("kitchenCreate").disabled = false; }
});

$("kitchenJoin").addEventListener("click", async () => {
  const code = $("kitchenCode").value.trim().toUpperCase();
  $("kitchenErr").hidden = true;
  if (code.length !== 6){
    $("kitchenErr").hidden = false;
    $("kitchenErr").textContent = "Код состоит из шести символов.";
    return;
  }
  $("kitchenJoin").disabled = true;
  try {
    const { data, error } = await sb.rpc("join_kitchen", { p_code: code });
    if (error) throw error;
    await useKitchen(data);
  } catch(err){
    $("kitchenErr").hidden = false;
    $("kitchenErr").textContent = "Кухня с таким кодом не найдена.";
  } finally { $("kitchenJoin").disabled = false; }
});

async function signOut(){
  try { await sb.auth.signOut(); } catch(e){}
  localStorage.removeItem("kartoteka:kitchen");
  location.reload();
}
$("signOut1").addEventListener("click", signOut);
$("signOut2").addEventListener("click", signOut);

/* =============================== запуск =============================== */

function startLocal(){
  mode = "local";
  gate.hide();
  loadCache();
  if (!DB.dishes.length) DB.dishes = SEED.map(s => normalize({ ...s, id: uid() }));
  recomputeCookStats();
  saveCache();
  refreshSync();
  rebuildDeck(); renderList(); show("deck");
}

async function useKitchen(k){
  kitchen = { id: k.id, name: k.name, join_code: k.join_code };
  localStorage.setItem("kartoteka:kitchen", JSON.stringify(kitchen));
  mode = "cloud";
  gate.show("loading");
  $("loadingText").textContent = "Загружаю блюда…";
  loadCache();
  recomputeCookStats();
  try {
    await pullAll();
  } catch(err){
    console.warn("не удалось загрузить из базы:", err);
  }
  subscribe();
  gate.hide();
  refreshSync();
  if (queue.length) flush();
  rebuildDeck(); renderList(); show("deck");
}

async function afterSignIn(){
  gate.show("loading");
  $("loadingText").textContent = "Ищу твою кухню…";
  const { data, error } = await sb
    .from("members")
    .select("kitchen_id, kitchens(id, name, join_code)");
  if (error){ gate.show("kitchen"); return; }
  const rows = (data || []).filter(r => r.kitchens);
  if (!rows.length){ gate.show("kitchen"); return; }

  const savedRaw = localStorage.getItem("kartoteka:kitchen");
  let pick = rows[0].kitchens;
  if (savedRaw){
    try {
      const saved = JSON.parse(savedRaw);
      const found = rows.find(r => r.kitchens.id === saved.id);
      if (found) pick = found.kitchens;
    } catch(e){}
  }
  await useKitchen(pick);
}

async function init(){
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY){
    startLocal();
    return;
  }
  gate.show("loading");
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch(err){
    console.warn("клиент Supabase не загрузился:", err);
    startLocal();
    toast("Не удалось загрузить библиотеку — работаю локально");
    return;
  }
  const { data } = await sb.auth.getSession();
  session = data.session;
  if (!session){ setAuthMode("in"); gate.show("auth"); return; }
  await afterSignIn();
}

if ("serviceWorker" in navigator){
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

init();
