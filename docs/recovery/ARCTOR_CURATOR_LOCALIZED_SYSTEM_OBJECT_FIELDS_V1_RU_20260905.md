# ARCTor — locale-aware поля создания системного ОН в Кураторе

Дата: 2026-09-05
Релиз: `ARCTOR_CURATOR_LOCALIZED_SYSTEM_OBJECT_FIELDS_V1`
Baseline: `3a5b3bdf8a71c7a97ff7705438f3718b87e0837d`

## Контекст

После перевода curator workflow на System-only ОН live acceptance показал устаревший
контракт: при `locale=uk` форма создания системного ОН всё ещё требовала
`Название RU / Определение RU` вместе с EN-полями.

Для мультиязычной панели куратора это неверно. Куратор должен описывать новый системный
ОН на выбранном языке интерфейса. Английский сохраняется как системный fallback.
Русский язык не должен быть обязательным для UK/PL/DE/ES/CS.

## Решение

### UI

Для выбранной локали показываются основные поля без технического суффикса языка:

- EN: `Name / Definition`;
- RU: `Название / Определение`;
- UK: `Назва / Визначення`;
- PL: `Nazwa / Definicja`;
- DE / ES / CS — соответствующие локализованные подписи.

Для любой локали, кроме EN, рядом дополнительно показываются явно подписанные
английские fallback-поля. Для `locale=en` второй дублирующий EN-набор скрыт.

### Backend

`create_observation_object` больше не требует `titleRu/descriptionRu`.

Контракт:
- `localizedTitle`;
- `localizedDescription`;
- выбранный `locale`;
- `titleEn`;
- `descriptionEn`.

При `locale=en` English fallback берётся из локальных полей автоматически.

Runtime System draft сохраняет:

`metadata_json.curator_system_draft_v1.localizations[locale]`

и всегда:

`metadata_json.curator_system_draft_v1.localizations.en`

Базовые `value_objects.title/description` остаются английским fallback для совместимости
с существующей глобальной моделью и старым кодом.

В provenance создания дополнительно фиксируются:
- `creationLocale`;
- localized title/description snapshot;
- English title/description snapshot.

## Архитектурное правило

**Куратор работает на выбранном языке интерфейса; системная модель хранит локализацию
этого языка и английский fallback. Русский язык не является обязательным системным полем.**

Это согласуется с уже существующим runtime localization reader, который поддерживает
`en / pl / ru / uk / de / es / cs`.

## Не изменяется

- System-only boundary;
- root → intermediate → leaf;
- canonical key;
- DB schema / SQL migrations;
- существующие ОН;
- публикация System draft;
- OpenAI;
- коммерческий контур.

## Проверки

- exact baseline/remote;
- canonical Git blobs;
- patcher `node --check`;
- patcher self-test;
- dedicated locale-aware validator;
- TypeScript pre-ESLint;
- touched/new ESLint = 0 errors / 0 warnings;
- full ESLint no regression;
- final TypeScript;
- production build;
- `git diff --check`;
- exact changed-file allowlist;
- code commit;
- recovery commit;
- push + remote verification;
- clean worktree.

## Live acceptance

1. `?locale=uk`: `Назва / Визначення` + `Англійська назва / Англійське визначення`.
2. На UK экране нет `Название RU / Определение RU`.
3. `?locale=pl`: польские основные поля + английские fallback-поля.
4. `?locale=ru`: русские основные поля + английские fallback-поля.
5. `?locale=en`: только один набор `Name / Definition`.
6. Созданный draft содержит selected-locale + EN runtime localization.
7. System draft остаётся ownerless, hidden, unpublished.

## Точка продолжения

Вернуться к сигналу `подтянулся 10 раз`, создать первый недостающий системный путь
из интерфейса Куратора и продолжить привязку `count`, затем `duration`.

Code commit: `cbb529ca2a452e043ff4c3a5794e43f412b258db`
