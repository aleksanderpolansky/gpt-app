# ARCTOR Knee Mechanical Load Ontology V1.0.1 — relation registry hotfix

Дата подготовки: 2026-09-18 19:07:42 +02:00

## Baseline

- branch: main
- HEAD: 85f59f50903e7c8e4d3ff18ec0b214ba4c833c64
- HEAD...origin/main: 0	0

## Причина hotfix

Первая попытка выполнения migration была остановлена production DB:

relation_family_code = NULL
violates NOT NULL constraint

Ошибка произошла до COMMIT внутри явной транзакции BEGIN/COMMIT.

## Что обнаружено

Production-схема value_object_relation_types содержит обязательные поля,
которых нет в исторической локальной migration, использованной как исходный
контракт при подготовке V1.

Нельзя придумывать relation_family_code вручную.

## Исправление V1.0.1

При создании classified_as migration теперь:

1. проверяет, что текущие активные ordinary writable relation types имеют
   один однозначный relation_family_code;
2. использует существующий production relation type related_to как полный
   шаблон актуальной строки registry;
3. через jsonb_populate_record сохраняет все актуальные обязательные
   production-поля;
4. явно переопределяет только контракт classified_as:
   - directed;
   - ordinary -> ordinary;
   - отдельные title/description keys;
   - reverse title/description keys;
   - display_order 25;
   - active;
   - canonical_write_policy_code=enabled;
   - leaf -> leaf;
5. если relation family неоднозначна, migration FAIL-CLOSED и ничего не
   записывает.

## Важно

Этим PowerShell SQL в production НЕ выполнялся.

Подготовлен только исправленный migration-файл и его точная копия помещена
в буфер обмена.

## SQL

supabase/migrations/20260918183000_knee_mechanical_load_ontology_v1.sql

SHA256:
30C7AE677B6CCF6D55D2D788DA91E41D66E5861B8E2DD97340C232B2C921DD22

## Следующее действие

Вставить содержимое буфера обмена целиком в Supabase SQL Editor и выполнить
один раз.

При любой ошибке не выполнять повторно до разбора.

## Статус

HOTFIX_PREPARED
DB_WRITE_EXECUTED=NO