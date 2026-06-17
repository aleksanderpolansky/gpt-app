# GPT-APP / AI-NAVIGATOR — Step 51 / 76: Post-save success state

Дата: 2026-06-17  
Блок: `ACTIVITY_FACTS_POST_SAVE_SUCCESS_STATE`  
Фаза генерального плана: 7 / 12  
Микрошаг: 51 / 76

## Цель

После сохранения активности пользователь должен видеть понятный результат:

1. `activity_event_id`
2. `measure_ids`
3. `activity_object_fact_ids`
4. `value_object_ids`
5. `activity_fact_review_item_ids`
6. `activity_fact_recalculation_queue_ids`
7. ссылки на facts / Value Objects tree / activity review

## Что добавляет этот patch

Файл:

- `src/components/workspace/contextual-ai/right-ai-save-intent-card.tsx`

получает UI-состояние `Post-save success state`.

Карточка умеет:

- показывать preview success contract без DB write;
- отправлять no-write probe на `/api/activity/facts/save-gate`;
- распознавать будущий successful response с created IDs;
- распознавать текущий locked response `ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED`;
- показывать links:
  - `/activity-facts`
  - `/value-objects/tree`
  - `/activity-capture`

## Ограничения безопасности

Этот шаг не включает runtime DB writes.

Не выполняется:

- SQL execution;
- Supabase migration;
- OpenAI call;
- commit;
- push;
- direct browser writes to Supabase tables.

Если endpoint возвращает `409` или `ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED`, UI показывает locked state, а не утверждает, что `activity_object_facts` реально созданы.

## Acceptance criteria

- Right AI Column показывает post-save success state card.
- Card содержит Activity Event ID, measure IDs, fact IDs, VO IDs, review item IDs, queue IDs.
- Card содержит явный safety текст: DB writes не включены этим UI patch.
- Card умеет отобразить реальные created IDs, когда guarded save API начнет возвращать успешный response.
- Card не создаёт скрытых DB writes.
- Patch затрагивает только self-contained UI card и этот docs contract.
