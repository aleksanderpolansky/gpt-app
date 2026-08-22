# ARCTOR_VO_CREATE_DELETE_UX_V1 — recovery checkpoint

Дата: 2026-08-22

## Точка входа

Перед этим шагом production-каталог ЦО/ОН был очищен для начала реального построения онтологии:

- `value_objects`: **174 → 15**;
- сохранены **4** скрытых коммерческих корня `Products & Services` разных provider-акторов;
- сохранены **11** коммерческих leaf `product_type/service_type`;
- видимых некоммерческих ЦО/ОН осталось **0**;
- существующий массажный сертификат, создание сертификата для личной услуги и услуги предприятия, а также выбор существующих товаров/услуг в offer-flow подтверждены пользователем после очистки.

Эти 15 коммерческих объектов не входят в обычный каталог `/value-objects` и не должны быть доступны для hard delete через пользовательский ontology-authoring UX.

## Причина release

При ручном создании root/intermediate/leaf POST реально создавал объект, но кнопка после ожидания снова становилась активной, а пользователь не получал явного success-state. Это создавало риск повторного submit и не давало прямой ссылки на только что созданный объект.

Также отсутствовала безопасная возможность удалить ошибочно созданный ЦО/ОН. Конкретный live-пример: `Latissimus dorsi` был по ошибке создан как `intermediate`, хотя должен быть `leaf`.

## Решение

### Создание

Для root/intermediate/leaf:

1. после успешного POST страница остаётся на форме и показывает зелёный success-state;
2. показываются название, роль и родитель (если есть);
3. появляется ссылка `Open object` на фактически созданный `redirectUrl`;
4. поля и create-button остаются disabled после успеха;
5. create-button меняет подпись на локализованное `Created`;
6. повторный submit блокируется локальным guard;
7. `router.prefetch()` подготавливает карточку, но не скрывает success-state автоматическим redirect.

### Удаление

Добавлен service-role RPC `delete_value_object_safe_v1` и `DELETE /api/value-objects/[id]`.

Hard delete разрешён только для объекта, который одновременно:

- принадлежит текущему app user + active actor;
- `scope_code=actor`;
- `source=manual`;
- `origin_type_code=user_declared`;
- `branch_type_code=ontology_v1`;
- `usage_scope=private`;
- не связан с organization/commercial usage;
- не является `product_type/service_type`;
- имеет `definition_version=1`;
- имеет status `draft|active`;
- не имеет structural children;
- не имеет никаких внешних FK-зависимостей.

RPC динамически инспектирует все текущие single-column FK на `public.value_objects` через `pg_constraint`. Дополнительно он fail-closed сканирует обычные public-таблицы на любые колонки `*value_object_id` даже без FK и отдельно проверяет polymorphic `concept_aliases`. Любая найденная внешняя ссылка блокирует удаление. Composite FK также блокирует операцию fail-closed.

Разрешено удалить только собственные intrinsic creation-ledger rows объекта:

- `value_object_ontology_write_requests` для этого объекта;
- `value_object_definition_versions` для этого объекта;
- `value_object_hierarchy_events`, где объект является `child_value_object_id`.

Если объект уже редактировался/restructure (`definition_version > 1`), использовался в facts/activity/template/relation/goal/commerce и т.п., hard delete запрещён. Для таких объектов позже используется lifecycle/retire, а не физическое удаление.

## Почему не CASCADE

Общий `DELETE FROM value_objects` недопустим: production имеет множество `CASCADE`, `SET NULL`, `RESTRICT/NO ACTION` ссылок. Автоматический CASCADE мог бы уничтожить смысловые связи, а SET NULL — незаметно оторвать evidence от объекта. Поэтому safe-delete сначала доказывает отсутствие внешних зависимостей и только затем удаляет объект и его собственный creation ledger одной транзакцией RPC.

## Ошибка/урок предыдущей очистки

Во время массового purge был обнаружен реальный пример того, почему нельзя полагаться на `ON DELETE SET NULL`: `ai_feedback_events.target_value_object_id` пытался стать `NULL`, но CHECK `ai_feedback_events_manual_link_shape_v1_check` запрещал такую форму. Транзакция откатилась. Исправленный purge завершился, а независимый read-only state check подтвердил `15 / 4 / 15 / 0 / 11`.

Также финальная diagnostic-часть purge один раз обратилась к TEMP-таблице после `COMMIT` (`_arctor_commercial_roots does not exist`). Сам purge к этому моменту уже был committed; независимый read-only check это подтвердил. Для текущего release DB postcheck не зависит от TEMP-таблиц.

## Evidence / acceptance

До source rollout обязательно:

1. выполнить `supabase/manual-applied/20260822_vo_create_delete_ux_v1.sql`;
2. выполнить read-only `supabase/diagnostics/20260822_vo_create_delete_ux_v1_postcheck_READONLY.sql`;
3. ожидать `total=12`, `passed=12`, `allPass=true`;
4. только после этого запускать source launcher с `-DbPostcheckPassed`.

Live acceptance после deployment:

1. создать новый intermediate и увидеть persistent success-state + `Open object`;
2. создать leaf и увидеть тот же success-state;
3. открыть ошибочный неиспользуемый `Latissimus dorsi` в edit mode и удалить его;
4. перейти по `Open parent` и подтвердить исчезновение объекта;
5. убедиться, что объект с дочерним узлом удалить нельзя;
6. убедиться, что существующие `Products & Services`, offers и gift certificates продолжают работать.

## Точка продолжения

После PASS этого release ручной CRUD достаточен для следующего этапа: **ARCTor VO Tree Designer / Mind Map на React Flow Free**. Новые рабочие ветви должны строиться уже через визуальный tree authoring, а не через последовательность отдельных страниц.
