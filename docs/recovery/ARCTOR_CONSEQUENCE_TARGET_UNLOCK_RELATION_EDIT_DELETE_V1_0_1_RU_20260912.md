# ARCTor — разблокировка target ОН + редактирование/удаление связей V1.0.1

Дата: 2026-09-12
Baseline: main @ 18e6b49926b15d80fa475c42494b856ece110432
Release: ARCTOR_CONSEQUENCE_TARGET_UNLOCK_RELATION_EDIT_DELETE_V1_0_1_20260912

## Контекст
После runtime-проверки общий слой связей ОН заработал end-to-end: связь leaf → leaf создаётся, отображается на странице `/admin/relations` и на карте связей ОН.

Дополнительно вручную в production DB была исправлена функция `guard_system_value_object_relation_v1()`: вместо legacy `node_role_code=structural` она теперь проверяет каноническое `ontology_node_role_code=leaf`. Это изменение необходимо закрепить миграцией в Git.

## Исправления
1. Конструктор последствий:
- Исправлен второй остаточный дефект leaf-filter: target-кандидаты теперь фильтруются по `ontology_node_role_code=leaf`, а не по `node_role_code=leaf`.
- Поиск целевого ОН доступен сразу, даже пока типовая активность ещё не выбрана.
- Target выбирается только из активных общих связей исходного ОН и только среди листовых global system ОН.
- Выбор target до появления типовой активности сохраняется за стабильным `consequenceTaskId` как `raw_pending_template`.
- После привязки типовой активности target не теряется: task ID остаётся тем же, а текущий контекст типовой активности читается из task binding.
- Если общая связь удалена/изменена и target перестал быть допустимым кандидатом, он больше не показывается как текущая выбранная цель.
- Несколько целевых ОН по-прежнему поддерживаются.
- Формулы не создаются.

2. Управление связями:
- На `/admin/relations` добавлены действия `Редактировать` и `Удалить`.
- `Редактировать` открывает существующий `/admin/relation-constructor` в edit-mode через `relationId`.
- В edit-mode загружаются те же четыре поля: исходный ОН, связанный ОН, вид связи, комментарий куратора.
- PUT может изменить любую из четырёх составляющих, при этом leaf-only, self-link и закрытый реестр типов связи сохраняются.
- Изменение фиксируется append-oriented audit event `system_value_object_relation_updated`.
- Удаление реализовано безопасно как soft delete: `status=inactive`.
- После удаления связь исчезает из страницы списка, карты и candidate list Конструктора последствий, но остаётся в БД и audit history.
- Удаление фиксируется audit event `system_value_object_relation_deleted`.

3. DB Reality Core:
- Добавлена идемпотентная migration, которая закрепляет уже вручную исправленный production guard.
- Guard проверяет `ontology_node_role_code=leaf` на обоих концах.
- Facet guard, relation type write policy, active/global endpoint constraints и node-role guard не снимаются.

## Архитектурное решение
Общая связь ОН остаётся глобальным leaf→leaf отношением. Target последствия можно выбрать до появления типовой активности как предварительное решение куратора, потому что consequence task имеет стабильную идентичность от raw signal + parameter + source leaf. Когда типовая активность назначается, target остаётся привязанным к тому же task и становится частью конкретного activity context.

## Acceptance
- validator PASS 30/30;
- targeted ESLint PASS;
- TypeScript `tsc --noEmit` PASS;
- production build PASS;
- recovery integrity PASS;
- `git diff --check` PASS;
- clean commit + push;
- target search available before typical activity;
- target candidates use `ontology_node_role_code=leaf`;
- edit relation works through PUT;
- delete relation uses soft inactive;
- manual DB guard fix is represented by migration;
- formula write remains disabled.
