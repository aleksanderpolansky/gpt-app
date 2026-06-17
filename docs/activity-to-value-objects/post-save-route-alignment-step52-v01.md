# GPT-APP / AI-NAVIGATOR — Step 52 / 76: Post-save route alignment

Дата: 2026-06-17  
Блок: `ACTIVITY_FACTS_POST_SAVE_RUNTIME_ROUTE_ALIGNMENT`  
Фаза генерального плана: 7 / 12  
Микрошаг: 52 / 76

## Причина

Step 51 добавил post-save success card в правой AI-колонке.

Карточка содержит canonical links:

- `/activity-facts`
- `/value-objects/tree`
- `/activity-capture`

Step 52A route audit показал:

- `/activity-facts` пока не имеет direct `src/app` page route;
- `/value-objects/tree` пока не имеет direct `src/app` page route;
- `/activity-capture` уже существует.

## Решение Step 52B

Создать безопасные read-only placeholder routes:

- `src/app/activity-facts/page.tsx`
- `src/app/value-objects/tree/page.tsx`

Эти страницы нужны, чтобы post-save success card не вела пользователя на 404.

## Почему не меняем ссылки обратно на preview routes

Генеральный план предусматривает canonical surfaces:

- `/activity-facts` — пользовательская таблица записанных фактов активности;
- `/value-objects/tree` — дерево Value Objects.

Поэтому правильнее создать безопасные placeholder pages под будущие canonical routes, чем возвращать success-card к временным preview-only адресам.

## Safety

Step 52B не включает:

- DB writes;
- SQL execution;
- OpenAI calls;
- Supabase client usage;
- server actions;
- commit;
- push.

Страницы являются read-only navigation placeholders and contract explainers.

## Acceptance criteria

- `/activity-facts` route exists.
- `/value-objects/tree` route exists.
- Both pages show explicit no-write contract.
- Both pages link to existing preview/canonical pages.
- No hidden DB writes, SQL, OpenAI calls, service role usage, Supabase client usage.
