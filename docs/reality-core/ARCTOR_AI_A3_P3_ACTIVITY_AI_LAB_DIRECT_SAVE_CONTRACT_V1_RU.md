# ARCTor — AI-A3-P3 Direct Save from Activity AI Lab v1

Дата: 2026-08-13
Статус: approved for implementation
Контракт: `AI_A3_P3_ACTIVITY_AI_LAB_DIRECT_SAVE_V1`

## Цель

После успешного полного Global Reality анализа пользователь должен завершать создание активности непосредственно на `/activity-ai-lab`, без обязательного перехода через `/calendar/activity-review`.

`/calendar/activity-review` не удаляется этим шагом физически: другие существующие сценарии ещё используют этот маршрут. P3 выводит из него только AI-Lab flow и тем самым не ломает независимые calendar/journal callers. Полное удаление legacy container возможно отдельным этапом после инвентаризации и перевода оставшихся callers.

## Почему промежуточный container больше не нужен AI Lab

`/activity-ai-lab` уже содержит более новый и более строгий результат Global Reality:

- bounded recognition profiles;
- UNKNOWN/UNRESOLVED вместо принудительного выбора;
- факты с evidence;
- secondary semantic projections;
- Data Capital review `✓ / ✕ / ✎ / ?`;
- ручной поиск и добавление leaf ЦО.

Повторный semantic preview внутри Activity Review Container создаёт второй, более старый слой интерпретации, дублирует уже выполненный анализ и увеличивает риск расхождения результатов. В live acceptance также обнаружено повреждённое отображение части русских строк в legacy container. Поэтому AI Lab больше не использует его как обязательный gate.

## Что добавляется на `/activity-ai-lab`

Перед непосредственным сохранением пользователь получает только поля, которые действительно нужны canonical activity write-path и которых раньше не хватало на AI Lab:

1. редактируемое название активности;
2. фактическое время для прошедшей активности либо расписание для будущей;
3. длительность без искусственных значений по умолчанию, кроме уже существующего PP1 exact-start policy;
4. planned targets для будущей активности;
5. существующие ручные semantic leaf links, собранные через Data Capital;
6. явное действие сохранения в журнал либо планирования с переходом в календарь.

## Канонический write-path

AI Lab вызывает только существующий canonical endpoint:

`POST /api/activity/events`

Для прошлого создаётся `activity_role_code=actual`, для будущего — `activity_role_code=planned`.

Для будущего exact schedule существующий API может создать calendar projection. Остальные schedule modes остаются канонической planned activity и открываются через `/calendar`.

После успешного создания `activity_event` ручные leaf-intents материализуются через:

`POST /api/ai/reality/manual-link-materialize`

как:

- `link_type=semantic_exposure`;
- `provenance_code=manual`;
- `semantic_match_method_code=user_confirmed`.

Существующий semantic exposure не перезаписывается.

## Разделение planned target и semantic exposure

Planned target — цель будущей активности и может относиться к root/intermediate/leaf в соответствии с действующим PP1 selector.

Manual semantic exposure — дополнительная пользовательская смысловая связь уже проанализированного эпизода и в P3 остаётся только leaf.

Эти понятия не объединяются в одно поле.

## Fact/projection write boundary

P3 не возвращает старый Activity Review fact-save pipeline.

Подтверждения фактов и semantic projections, созданные на AI Lab, остаются append-only Data Capital evidence. Их автоматическая материализация в Reality Graph этим контрактом НЕ включается.

Это сохраняет уже принятые границы AI-A2-P3:

- secondary projections preview-only;
- no automatic Reality Graph write;
- no extra provider calls.

Контролируемая materialization подтверждённых facts/projections — отдельный последующий этап.

## Stale-analysis guard

Результат анализа разрешено сохранить только пока одновременно выполняются условия:

- текущий текст после trim равен тексту, который был полностью проанализирован;
- текущая locale равна locale полного анализа;
- результат `global-observation-preview` завершён `ok=true`.

Изменение текста или locale инвалидирует analysis result, manual link UI и direct-save state. Это закрывает сценарий «проанализировал A, затем изменил сообщение на B и сохранил B с provenance анализа A».

Fallback semantic preview недостаточен для direct save.

## Idempotency и partial-save recovery

На каждый режим `past/future` создаётся client idempotency key.

Если canonical `activity_event` уже создан, но materialization ручных links завершилась ошибкой:

- созданная активность не удаляется;
- UI хранит checkpoint с `activity_event_id`;
- поля activity create блокируются;
- повторное действие завершает только manual-link materialization;
- повторный POST activity create не выполняется;
- materializer остаётся idempotent и не перезаписывает существующие semantic exposure links.

## Навигация после успеха

- past → `/activity-today?locale=...`;
- future → `/calendar?locale=...` с `focusDate`, если он известен.

## Legacy route boundary

Этим release запрещено удалять или переписывать `/calendar/activity-review` только ради AI Lab, потому что существующие calendar/journal components могут всё ещё ссылаться на него.

P3 меняет именно source flow `/activity-ai-lab → canonical activity write`, а полное удаление legacy container требует отдельного caller migration + acceptance.

## Acceptance

Release считается code-level PASS при выполнении:

1. AI Lab больше не строит ссылку на `/calendar/activity-review` для past/future save.
2. На AI Lab присутствуют title + timing + future planned target controls.
3. Save идёт через `/api/activity/events`.
4. Manual links после create идут через `/api/ai/reality/manual-link-materialize`.
5. Text/locale changes инвалидируют полный анализ.
6. Partial create/materialization failure не может создать duplicate activity на retry.
7. Existing AI-A3-P2 feedback controls и manual leaf selector остаются intact.
8. AI-A2 P1/P2/P3, AI-A1, GSR1F and Global Seed validators проходят.
9. Feature/main builds проходят.
10. `git diff --check` и `git diff --cached --check` проходят.

Production acceptance после release: одна past activity и одна future activity сохраняются из AI Lab без посещения Activity Review Container; ручной leaf materializes как `semantic_exposure`.
