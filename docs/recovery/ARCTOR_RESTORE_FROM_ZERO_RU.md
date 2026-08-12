# ARCTor.app — восстановление с нуля

Цель: восстановить текущее состояние проекта на новом компьютере без необходимости перечитывать старые чаты.

## 1. Скачать репозиторий

Репозиторий:

`aleksanderpolansky/gpt-app`

После клонирования получить все ветки и переключиться на:

`feat/gsr1-global-system-reality-machine-contract-v1-20260811`

Контрольный commit этого recovery snapshot:

`843d1ea6bdf0ee822416d5ccfa9d8d445718c7c4`

До применения новых изменений проверить:

```powershell
git branch --show-current
git rev-parse HEAD
git status --short
```

Ожидается правильная ветка, нужный commit и чистая рабочая папка.

## 2. Установить зависимости

В корне проекта установить зависимости способом, соответствующим lockfile репозитория.

После этого проверить production build:

```powershell
npm run build
```

Не использовать `npm audit fix --force`.

## 3. Прочитать recovery docs

Порядок:

1. `docs/recovery/ARCTOR_CURRENT_STATE_RU.md`
2. `docs/recovery/ARCTOR_DECISIONS_AND_FAILURES_RU.md`
3. `docs/recovery/CHECKPOINT_MANIFEST.json`
4. `docs/recovery/evidence/`

Этого должно быть достаточно, чтобы понять откуда продолжать.

## 4. Supabase

Manual SQL считается отдельным audit ledger.

На текущей контрольной точке уже применены как минимум:

- `20260811_gsr1c_global_aliases_recognition_v3.sql`
- `20260811_gsr1d_global_runtime_bridge_ai_budget_v1.sql`
- `20260811_gsr1e_openai_pilot_price_refresh_budget_hardening_v1.sql`

Не запускать их повторно вслепую.

Сначала выполнить read-only preflight и сравнить живую БД с ожидаемым состоянием.

Ожидаемая Global System Reality seed:

- global objects = 150;
- roots = 12;
- intermediate = 35;
- leaves = 103.

## 5. Переменные среды

Секреты в recovery docs и Git не сохраняются.

Для работы pilot нужны существующие локальные/hosting environment variables, включая OpenAI, Supabase и Auth0/Vercel конфигурацию.

Если секреты утрачены, их нужно перевыпустить у соответствующего провайдера, а не искать в Git.

## 6. Проверки Global System Reality

Перед новым patch выполнить существующие validators:

```powershell
node scripts/validate-gsr1f-global-observation-preview-v1.mjs
node scripts/validate-global-system-reality-seed-v1.mjs
npm run build
```

## 7. OpenAI budget rule

Нельзя запускать новый тест, если его документированный максимум может превысить USD 0.10 на одну operation без нового явного подтверждения.

Текущий обычный двухступенчатый Nano pilot имеет документированный максимум USD 0.00975 на одну operation.

Не запускать весь 24-fixture corpus одним пакетом без отдельного расчёта бюджета.

## 8. С чего продолжать после этого checkpoint

Текущий незавершённый вопрос:

G24:

`Ужинал вчера около девяти вечера.`

К GSR1I V3 уже подтверждено:

- leaf = `process.nutrition.meal`;
- локальное время вчера около 21:00 восстановлено;
- `temporalPrecision=approximate`.

Последняя попытка нормализовать `meal_label` в `dinner` (GSR1I V4) дала HTTP 500 и была автоматически откатана.

Поэтому следующий шаг:

1. открыть последний GSR1I V4 REPORT / raw response в `docs/recovery/evidence/`, если он доступен;
2. найти точную причину HTTP 500;
3. исправить только эту причину;
4. повторить только G24;
5. при PASS — commit code + validator + recovery update + evidence.

## 9. Что остаётся заблокированным

P8 Goal World Compiler остаётся заблокированным до завершения Global System Reality one-week pilot gates.
