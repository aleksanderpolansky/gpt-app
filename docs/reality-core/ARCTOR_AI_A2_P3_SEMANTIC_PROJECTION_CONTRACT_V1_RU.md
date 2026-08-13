# ARCTor AI-A2-P3 — Semantic Projection Preview Contract v1

Дата: 2026-08-13
Маркер: `AI_A2_P3_SEMANTIC_PROJECTION_PREVIEW_V1`

## 1. Назначение

После того как AI-A2-P2 распознал основной листовой ЦО эпизода, P3 может показать дополнительные смысловые проекции одного и того же события. Проекция не создаёт второй структурный родитель, не меняет основной выбранный ЦО и не создаёт новую активность.

P3 является только preview-слоем. Он не пишет проекции в Reality Graph и не добавляет вызовы OpenAI.

## 2. Эпистемическая граница

Каждая проекция обязана иметь явный `epistemicStatus` и текстовое основание.

- `DERIVED` — детерминированный вывод из явно присутствующего класса предмета/события.
- `INFERRED` — контекстное предположение, которое нельзя выдавать за наблюдаемый факт.
- `OBSERVED`, `DECLARED`, `MODEL_HYPOTHESIS` остаются допустимыми классами общего контракта, но P3 v1 их автоматически не создаёт.

Любая P3-проекция имеет `writeAllowed=false` и `primaryClassificationChanged=false`.

## 3. Разрешённые P3 v1 проекции

| projectionCode | Target | Status | Правило |
|---|---|---|---|
| `purchase_contains_food_goods` | `entity.food.item` | DERIVED | Основной ЦО = `process.finance.purchase`, а в том же selected sourceFragment есть явный food cue. |
| `relevant_to_nutrition` | `domain.nutrition_consumption` | DERIVED | Та же покупка содержит пищевые товары. Покупка не превращается в `process.nutrition.meal`. |
| `possible_household_provisioning` | `process.home.household_task` | INFERRED | Есть food cue в selected sourceFragment и store/shopping cue в полном сообщении. Это только возможный бытовой контекст, не primary classification. |
| `possible_family_benefit` | `domain.relationships_social_life` | INFERRED | Есть food cue и явный family cue в сообщении. Продукты сами по себе не доказывают интерес семьи. |

## 4. Cross-segment context

Stage 1 может разделить одно сообщение на несколько наблюдений. Поэтому secondary projection может использовать полный исходный `inputText` как контекст, но P3 v1 требует, чтобы пищевой признак находился именно в `sourceFragment` выбранной покупки. Это не позволяет соседнему нерелевантному фрагменту превратить любую покупку в пищевую.

## 5. Target guard

P3 v1 разрешает только следующие target canonical keys и node roles:

- `entity.food.item` — leaf;
- `domain.nutrition_consumption` — root;
- `process.home.household_task` — leaf;
- `domain.relationships_social_life` — root.

Runtime обязан прочитать эти target из live `value_objects`, проверить `scope_code=global`, `status=active` и ожидаемый `ontology_node_role_code`. Неизвестный или изменившийся target блокирует preview вместо тихой подмены.

## 6. Безопасность

P3 v1 не меняет:

- максимум 2 provider calls;
- Nano tier;
- `maxRetries=0`;
- `store=false`;
- USD 0.10 hard cap;
- AI-A1 execution/context manifests;
- AI-A2-P2 recognition candidate guards;
- `dbFactWriteExecuted=false`;
- Activity Review/save-gate как единственную границу записи.

Проекции P3 не сохраняются при нажатии save до отдельного design/write contract. На этом шаге они являются объяснимой preview-аннотацией для проверки семантики пользователем.

## 7. Gold regressions

1. Stokrotka: selected purchase + tuna/pasta + store context → food goods + nutrition + possible household; family projection запрещена без family cue.
2. `спал примерно 6 часов` → unresolved day/night и 0 P3 projections.
3. `купил в магазине продукты жене и детям` → возможна `possible_family_benefit`, но только со статусом INFERRED.
4. `купил ноутбук в магазине` → P3 v1 не объявляет food/nutrition/household provisioning.
