# ARCTor — Reality Curator Journey Log V1 — recovery checkpoint

Дата: 02.09.2026

## Цель этапа

Зафиксировать неизменяемую фактическую линию успешно пройденных шагов по каждому сигналу куратора. Текущий чек-лист может эволюционировать, поэтому журнал хранит не только номер шага, а устойчивый смысловой `eventCode`, версию чек-листа и текстовый снимок шага на момент события.

## Источник истины

Для текущего пользовательского activity-сигнала используется уже существующая append-oriented таблица `public.activity_processing_logs`.

Новая таблица и новая миграция на этом этапе не создаются.

Записи журнала:
- `processor_name = reality_curator_journey`;
- `processor_version = 1`;
- `metadata_json.journeyContract = ARCTOR_REALITY_CURATOR_JOURNEY_V1`;
- append-only на уровне приложения;
- детерминированный UUID события из `(journeyContract, raw_signal_id, eventCode)` делает повторный запуск идемпотентным через существующий primary key;
- исходный пользовательский текст в строки journey не копируется; доказательства связываются через `raw_signal_id` и `activity_event_id`.

## Первые устойчивые события

1. `candidate_signal_registered`
2. `activity_event_saved`
3. `background_analysis_completed`
4. `missing_typical_activity_detected`
5. `curator_queue_registered`

Для `curator_queue_registered` сохраняется снимок текущего чек-листа v2.0, шаг 1.

## Рабочий runtime

После успешного `basicIntakeAnalysisV1` с `noSuitableTypicalActivity = true` и пустым `templateCandidates` сервер:
1. сохраняет результат анализа как раньше;
2. достаёт durable timestamps исходного сигнала и activity event;
3. гарантирует наличие всех пяти journey-событий;
4. ошибка журналирования не превращает уже сохранённую пользовательскую активность в FAIL; ошибка пишется в server log и может быть обнаружена контролем полноты journey.

При повторном обращении к уже завершённому анализу `ensureMissingTypicalActivityJourney()` выполняется снова идемпотентно и самовосстанавливает недостающий журнал.

## UI куратора

`/admin/reality-curator/signals` показывает для каждой карточки блок «Фактически пройденный путь» в хронологическом/семантическом порядке:
- зелёная отметка успешного шага;
- время;
- устойчивый event code;
- версия чек-листа;
- номер/снимок шага, если событие относится к конкретному шагу чек-листа;
- provenance.

## Backfill

После подтверждённого commit/push release runner выполняет только additive backfill для уже существующих missing-typical-activity сигналов (максимум 500 последних quick-capture сигналов). Backfill:
- не меняет `raw_activity_signals`;
- не меняет `activity_events`;
- INSERT только в `activity_processing_logs`;
- игнорирует только duplicate primary key `23505`;
- после записи проверяет, что у каждого подходящего сигнала есть все пять event codes.

Так текущий пилот «шёл пешком на работу 15 минут» получает полноценную линию пути с provenance `release_backfill_durable_evidence`, а новые сигналы — `runtime_durable_evidence`.

## Следующая точка

Следующее ручное действие куратора должно добавлять новые append-only event codes:
`triage_started`, `triage_completed`, затем `gap_confirmed` / `no_gap_confirmed`, не переписывая уже существующую историю.
