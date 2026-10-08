# ARCTOR Commercial Feed Actor Control Hotfix V1

Date: 2026-10-08

Baseline: `5db1eb7fba649ed4670814700775688c54dab1c1`

## Причина

Production smoke публикации `Lidl в Щецине продаёт яблоки по 4 zł за кг.`
создал `message_objects`, но не создал `raw_activity_signals` и
`activity_events`.

Vercel runtime log:

```text
COMMERCIAL_FEED_ACTIVITY_BRIDGE_FAILED
COMMERCIAL_FEED_ACTOR_CONTROL_CHECK_FAILED:
permission denied for function message_actor_controlled_by_user_v1
```

`message_actor_controlled_by_user_v1` исторически является trigger/helper
границей и намеренно не имеет EXECUTE для service_role.

## Исправление

Коммерческий bridge больше не вызывает helper через RPC.
Server-side service-role код выполняет эквивалентную проверку через существующие
таблицы:

- person/avatar -> actor_public_profiles.owner_user_id;
- organization -> actors.organization_id -> organizations.owner_actor_id ->
  actor_public_profiles.owner_user_id.

Права на helper RPC не расширяются. SQL/DDL не требуется.

## Проверка

После deploy повторить одну новую публичную публикацию и проверить:
message_objects -> raw_activity_signals -> activity_events -> basic intake.
