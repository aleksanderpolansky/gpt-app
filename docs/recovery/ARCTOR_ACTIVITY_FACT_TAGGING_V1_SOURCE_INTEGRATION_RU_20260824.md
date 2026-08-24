# ARCTor — Activity Fact Tagging V1 — Source Integration

Дата релиза: 2026-08-24
Исходный source baseline: `771f5d5338c471744a423bf22837fe0586a618da`

## Текущее состояние

DB Foundation `ARCTOR_ACTIVITY_FACT_TAGGING_V1_DB_FOUNDATION_POSTCHECK_V1` принят по production evidence: 27/27, `allPass=true`.

Этот source-release подключает существующую DB foundation к рабочему пользовательскому и аналитическому контуру без создания второго параллельного интерфейса.

## Зафиксированные решения

1. `/activity-facts` остаётся основной поверхностью проверки фактов.
2. Итоговые связи факта с ЦО/ОН читаются через `activity_fact_value_object_links_effective_v1`.
3. Предложения смыслового разбора никогда не сохраняются автоматически.
4. Пользователь явно принимает/отклоняет предложение либо добавляет leaf ЦО вручную.
5. Единственная операция записи итогового набора связей — серверный вызов `replace_activity_fact_value_object_links_v1`.
6. Клиент не может изобрести provenance `template_profile`: такой provenance разрешено только сохранить из уже существующей materialized связи.
7. Legacy bridge при явном сохранении преобразуется в `correction`; `legacy_fact` напрямую не материализуется.
8. Неизвестные понятия не создаются автоматически.
9. Dashboard duration-by-root читает финальные теги и canonical measure values через `activity_fact_analytics_inputs_v1`; виртуальное разворачивание шаблона не используется.

## Изменённые поверхности

- `src/app/activity-facts/page.tsx`
- `src/app/activity-facts/activity-fact-tagging-panel.tsx`
- `src/app/api/activity/facts/route.ts`
- `src/app/api/activity/facts/[id]/tagging/route.ts`
- `src/app/api/dashboard/analytics-data/route.ts`
- этот recovery checkpoint

## Защита и отказоустойчивость

- source release стартует только с точного Git baseline;
- dirty worktree запрещён;
- remote `main` должен совпадать с baseline;
- изменяемые baseline-файлы проверяются по Git blob SHA;
- changed-path allowlist жёсткий;
- `git diff --check`, TypeScript, ESLint и production build обязательны до commit;
- при ошибке до commit изменяются обратно только release-owned paths;
- после созданного commit история автоматически не переписывается;
- push можно безопасно возобновить отдельным `-ResumePush`;
- локальный непушенный release commit можно удалить только явным `-RollbackLocalCommit` и только если remote всё ещё на baseline.

## Ошибки / уроки

- Нельзя считать runtime template profile финальной семантической связью факта: шаблон даёт предложения, финальный tag-set принадлежит самому факту.
- Нельзя дублировать числовое значение при раздаче факта по нескольким ЦО: аналитика использует canonical measure source.
- Нельзя выдавать детерминированный registry/recognition lookup за LLM-анализ; UI называет его дополнительным смысловым разбором.
- Нельзя разрешать клиенту подделывать `template_profile` provenance.
- Production precommit V3 дошёл до `tsc` PASS и остановился на ESLint существующей страницы `/activity-facts`: нестабильный массив `facts` и синхронный вызов `loadFacts()` из `useEffect`. Автоматический rollback подтверждён как CLEAN; V4 устраняет оба замечания до commit.

## Evidence релиза

- launcher timestamp: 2026-08-24T14:43:35+02:00
- baseline local/remote: $Baseline
- package SHA256: $packageSha
- patcher self-test: PASS
- patcher dry-run: PASS
- changed-path allowlist: PASS
- git diff --check: PASS
- npx tsc --noEmit: PASS
- ESLint changed paths with --max-warnings=0: PASS
- npm run build: PASS
- warning-token hits captured in command output before commit: $script:WarningHitCount
- final commit SHA and remote verification: see release REPORT in Downloads.

## Точка продолжения

После PASS этого source-release:
1. провести controlled runtime proof на одном подтверждённом факте;
2. принять/отклонить предложения;
3. сохранить итоговый набор связей;
4. проверить повторное чтение `/activity-facts`;
5. проверить, что dashboard использует только финальные теги и не создаёт новых business rows;
6. только после этого закрывать Activity Fact Tagging V1 целиком и переходить к следующему слою routing/runtime.
