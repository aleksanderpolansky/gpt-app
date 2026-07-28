# ARCTor.app — CUX5 Scalable Value Object Selector

**Дата:** 28.07.2026
**Production baseline:** `main @ 5da29999810e2bc46d07eca577ead754ed5ca118`

## Цель

Заменить длинный список checkbox удобным селектором объектов наблюдения для плановой активности.

CUX5 не меняет смысл planned targets и не вводит новый тип связи. Выбранные идентификаторы по-прежнему передаются в `plannedTargetValueObjectIds`, а PP1 создаёт `activity_value_object_links` с:

- `link_type = planned_target`;
- `status = active`;
- `provenance_code = manual`.

## Реализовано

### 1. Отдельный selector read API

Добавлен:

```text
GET /api/value-objects/selector
```

API:

- использует текущий `resolveActiveActorContext`;
- возвращает только объекты активного пользователя и активного профиля;
- принимает поиск по подстроке;
- фильтрует по branch policy;
- фильтрует по уровням root / intermediate / leaf;
- возвращает canonical path от корня к объекту;
- извлекает aliases из `metadata_json` и `identity_attributes_json`;
- поддерживает pinned IDs для выбранных, недавних и избранных объектов;
- ограничивает число возвращаемых результатов;
- не меняет существующий `GET /api/value-objects`.

Полный путь строится из текущего `parent_value_object_id`. Новая таблица пути не создаётся.

### 2. Удобный selector UI

`PlannedTargetSelectorPp1` теперь содержит:

- строку поиска;
- фильтр branch policy;
- фильтр уровня дерева;
- вкладки «Все / Недавние / Избранные»;
- полный breadcrumbs path;
- отметку уровня и политики ветви;
- несколько выбранных chips;
- добавление и удаление объекта одним нажатием;
- видимый active-profile scope.

### 3. Recent и favorite

В CUX5 это UX-настройки браузера, привязанные к `activeActorId`.

Ключи:

```text
arctor:cux5:<actorId>:recent
arctor:cux5:<actorId>:favorites
```

Это не новая доменная сущность и не изменение Reality Model. Перенос настроек между устройствами можно сделать позднее отдельным preferences-контрактом.

### 4. Controlled create-new flow

Из selector можно создать черновик:

- root;
- intermediate;
- leaf.

Используются уже существующие controlled creation modes:

```text
root_draft_v3
intermediate_draft_v3
leaf_draft_v3
```

Для root явно выбирается branch policy.
Для intermediate и leaf явно выбирается структурный parent.
Созданный объект сразу возвращается в selector и выбирается как planned target.

Расширенные свойства можно продолжить редактировать через существующий detail/editor route.

## Что не реализуется в CUX5

По решению проекта AI-часть календарного плана вынесена в будущий блок AN3 Master Plan v5.

В CUX5 не добавляются:

- AI suggestions;
- автоматический выбор объекта;
- автоматическое подтверждение semantic targets;
- AI fan-out к leaf objects;
- Impact Rule Registry;
- аналитические расчёты.

## Важное ограничение модели

CUX5 не вводит «главный» и «дополнительный» planned target.

Текущий подтверждённый PP1-контракт хранит несколько равноправных связей `planned_target`. Исходный Calendar UX Plan v1 требует multiple selected chips, но не требует менять роль связи.

Отдельная семантика primary/additional не добавляется без отдельного data-contract решения.

## Файлы

Изменяется:

```text
src/components/activity/pp1/planned-target-selector.tsx
```

Добавляются:

```text
src/app/api/value-objects/selector/route.ts
docs/CUX5_SCALABLE_VALUE_OBJECT_SELECTOR_RU_20260728.md
scripts/cux5-value-object-selector-contract-check.mjs
```

## Acceptance

1. Selector ограничен active actor/profile.
2. Поиск работает по title, aliases и path.
3. Branch policy filter работает.
4. Root/intermediate/leaf filter работает.
5. Полный breadcrumbs отображается.
6. Можно выбрать несколько объектов.
7. Selected chips сохраняют текущий PP1 массив IDs.
8. Recent/favorite работают отдельно для active actor в браузере.
9. Controlled create root/intermediate/leaf возвращает объект в selector.
10. `/api/value-objects` POST и PP1 write contract не меняются.
11. AI suggestions отсутствуют.
12. Миграции базы отсутствуют.
