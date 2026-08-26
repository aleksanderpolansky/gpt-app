# ARCTor — Message Objects F2 — Production Smoke Closure V1

Дата: 2026-08-26
Release: `ARCTOR_MESSAGE_OBJECTS_F2_PRODUCTION_SMOKE_CLOSURE_V1`
Baseline перед closure: `main @ bc870d1f54adf39c543be2e4b9b787640c5d29fb`

## Итог

F2 Native Enterprise Publication и последующий Updates/Localization hotfix считаются **production PASS**.

Подтверждён реальный end-to-end сценарий:

1. владелец предприятия видит форму новой публикации;
2. владелец публикует текст;
3. создаётся один canonical `message_object`;
4. создаётся ARCTor distribution;
5. публикация появляется в публичном блоке предприятия;
6. Guest видит публикацию;
7. Guest не видит форму публикации;
8. первый запрос нового locale показывает локальный translation-pending fallback только внутри блока;
9. после AI-localization появляется перевод;
10. повторный `F5` показывает перевод сразу, без повторного translation-pending состояния — cache hit подтверждён.

## Production smoke — подтверждённые наблюдения

Предприятие: `303c4744-7f37-47bd-b27d-d28d9a39e144`.

PL owner-view:

- блок называется `Aktualności`;
- блок находится сверху справа рядом с `Opis`;
- форма `Nowa publikacja` доступна владельцу;
- первый PL-localization request показывал `Tłumaczenie na język polski…`;
- после завершения была показана локализованная публикация.

PL Guest-view:

- публикация публично видна;
- composer/form publication отсутствует.

EN Guest-view:

- блок называется `Updates`;
- первый EN-localization request показывал `Translating into English…`;
- после завершения отображался текст `ARCTor test publication`;
- после `F5` `ARCTor test publication` появился сразу без повторного `Translating into English…`.

## UI terminology

Канонические названия блока:

- RU — `Новости и публикации`
- PL — `Aktualności`
- EN — `Updates`
- UK — `Новини та публікації`
- DE — `Neuigkeiten`
- ES — `Novedades`
- CS — `Aktuality`

Канонический layout:

`Description / Описание | Updates / Новости и публикации`

`Certificates and POINTS | Public offers`

## Архитектурное состояние после F2

Фундамент остаётся:

`message_objects`
- `message_object_audience_actors`
- `message_object_relations`
- `message_object_distributions`
- `message_object_media`

Feed не является отдельной фундаментальной сущностью. Feed — это read projection над доступными `message_objects`.

Публикация предприятия — один canonical `message_object`; ARCTor и будущие внешние социальные сети являются отдельными distributions.

## Recovery evidence

Статическая запись пользовательского production smoke:

`docs/recovery/evidence/MESSAGE_OBJECTS/ARCTOR_MESSAGE_OBJECTS_F2_PRODUCTION_SMOKE_20260826.txt`

Launcher closure дополнительно выполняет read-only DB smoke evidence:

- active organization actor существует;
- существует active + public `message_object` предприятия;
- существует `arctor + succeeded` distribution;
- в `metadata_json.localizedContent` присутствует закешированный EN и PL content;
- runtime cache marker соответствует `ARCTOR_MESSAGE_OBJECT_ON_DEMAND_LOCALIZATION_V1`.

Read-only DB evidence сохраняется в release PACKAGE, но launcher не выполняет DB writes.

## Что закрыто

- F1 Message Objects Core — DONE;
- F2 Native Enterprise Publication — DONE;
- F2L Updates + multilingual on-demand localization — DONE;
- базовая Enterprise Updates Feed — DONE.

## Следующая точка

Следующий крупный функциональный этап: **F4 Global ARCTor Feed**.

Первая версия `/feed` должна использовать только уже существующие native ARCTor public `message_objects`, без Facebook/Instagram/LinkedIn/TikTok/YouTube и без retail feeds.

Перед F4 не создавать новую фундаментальную `Feed Item` / `Publication` таблицу. Global Feed строится как проекция над `message_objects`.
