# ARCTor — Activity Message Time Patch V1.1 — Push checkpoint

Дата: 2026-09-22 19:08:44 +02:00

## Baseline

- previous HEAD: 66a5643cd4dbe1a20f1d35623bb0a071e184f49e
- branch: main

## Патч

ARCTOR_ACTIVITY_MESSAGE_TIME_PATCH_V1_1_20260922

## Выполненные проверки

- temporal validator: PASS 14/14
- targeted ESLint: PASS
- TypeScript: PASS
- git diff --check: PASS
- production build: PASS

## Зафиксированное временное правило

Для завершённой фактической активности:

1. Явное время пользователя имеет приоритет.
2. Если указана длительность, но время не указано:
   ended_at = timestamp сообщения;
   started_at = ended_at - duration.
3. Если не указаны ни время, ни длительность:
   started_at = timestamp сообщения;
   ended_at = timestamp сообщения;
   duration_minutes = null.

Время создания исходного факта,
результирующего факта или запуска формулы
не заменяет время activity_event.

## Кодовый commit

ca6879bc77a7bbddd6fb575e13ac6d4e74eca1c1

## Push

- origin/main: ca6879bc77a7bbddd6fb575e13ac6d4e74eca1c1
- status: PASS

## Следующий browser gate

После Vercel Ready создать новую активность:

Выпил одну порцию протеиновой добавки

Ожидается:

- startedAt != null;
- endedAt != null;
- durationMinutes = null;
- preflight не возвращает SOURCE_SNAPSHOT_ACTIVITY_TIME_REQUIRED;
- кнопка подтверждения становится активной;
- после подтверждения записывается Mass = 35 g из snapshot.

Второй тест:

Употребил 20 г протеиновой добавки

Ожидается:

Mass = 20 g, потому что explicit value имеет приоритет над snapshot.
