# ARCTor — AI-A3-P2 Feedback Review UX + Manual Leaf Link v1

Дата: 2026-08-13
Статус: approved for implementation
Контракт: `AI_A3_P2_FEEDBACK_REVIEW_UX_V1`

## Цель

После успешного Global Reality preview пользователь должен иметь возможность дать точечную обратную связь по конкретным результатам анализа и вручную добавить связь с листовым ценным объектом, не разрушая исходное предложение AI и не превращая вторичные смыслы в структурных родителей.

## 1. Действия возле проверяемых строк

Для `primary_selection`, `fact`, `semantic_projection` и `unresolved` журнал может показывать:

- `✓` — `confirmed`;
- `✕` — `rejected`;
- `✎` — текстовое объяснение пользователя, сохраняемое как `commented`;
- `?` — локальное объяснение основания; это действие ничего не пишет в БД.

Одна сохранённая реакция является append-only evidence. P2 не выполняет UPDATE/DELETE feedback rows и не стирает исходное предложение.

`ai_feedback_corrections` создан AI-A3-P1, но P2 не использует его для свободного комментария. Структурные corrections будут отдельным контрактом, чтобы не создавать полу-записанную пару event/correction без атомарного RPC.

## 2. Provenance

Feedback записывается только backend/service-role после Auth0 + active actor resolution.

Каждая запись обязана ссылаться на completed `ai_analysis_executions` с:

- `surface_code=global_observation_preview`;
- `operation_kind=activity_semantic_intake`;
- тем же `app_user_id` и `actor_id`;
- тем же `external_operation_id`, который вернул `/activity-ai-lab`.

`client_feedback_id` используется как idempotency key. Повтор того же UUID с другим содержимым должен завершаться конфликтом, а не создавать неоднозначную историю.

## 3. Ручной плюс ЦО

После успешного Global Reality preview внизу журнала доступно `+ Добавить связь с ЦО`.

Поиск использует существующий `/api/value-objects/selector` с opt-in `includeGlobal=1` и `level=leaf`.

Default selector contract не меняется: без `includeGlobal=1` существующие вызовы продолжают работать в прежнем actor-owned scope.

При opt-in selector объединяет:

- active GLOBAL ontology;
- draft/active ЦО активного пользователя/актора.

Для определения root/intermediate/leaf opt-in режим сначала использует `ontology_node_role_code`, затем legacy fallback.

Выбор результата создаёт только `manual_leaf_link` feedback intent с `verdict_code=manual_link_added`. До существования `activity_event` запись в `activity_value_object_links` запрещена.

## 4. Материализация после save-gate

При переходе из `/activity-ai-lab` в past Activity Review передаются только:

- `analysisOperationId`;
- UUID feedback intents `manualFeedbackIds`.

После создания canonical `activity_event` Activity Review вызывает backend materialization endpoint.

Endpoint повторно проверяет:

1. activity принадлежит текущему `app_user_id + acting_as_actor_id`;
2. analysis execution completed и принадлежит тому же пользователю/актору;
3. каждый feedback id принадлежит именно этому analysis execution;
4. каждый feedback имеет `target_kind=manual_leaf_link` и `verdict_code=manual_link_added`.

Только после этого выполняется idempotent upsert в `activity_value_object_links`:

- `link_type=semantic_exposure`;
- `status=active`;
- `provenance_code=manual`;
- `confidence=1`;
- `semantic_match_confidence=1`;
- `semantic_match_method_code=user_confirmed`;
- evidence содержит `feedbackEventId`.

DB guards AI-A3-P1 и GSR1D остаются финальной защитой leaf/status/ownership GLOBAL и actor-owned ЦО.

## 5. Границы

- P3 primary recognition и semantic projection rules не меняются.
- `✓/✕/✎/?` не вызывают OpenAI.
- Поиск ЦО не вызывает OpenAI.
- Ручная связь появляется в Reality Graph только после явного выбора пользователя и сохранения canonical activity.
- Автоматические P3 semantic projections по-прежнему preview-only и сами не материализуются.
- Планы используют существующий PlannedTargetSelector; manual semantic-exposure carry-over в этом контракте предназначен для past `/activity-ai-lab` flow.
- В P2 нет автоматического переобучения и изменения Global ontology/Recognition Profiles.

- Existing semantic_exposure links are never overwritten by manual materialization; the feedback event preserves the user confirmation separately.
