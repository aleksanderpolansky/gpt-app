# M-0196 / ARI-04.07.03 — inherited relations (local read model)

**Master:** «Отдельно вернуть inherited relations с rule_id, depth и applicability».

## Scope

Локальный read-only projector `projectInheritedRelationsV1` принимает **уже полученные из доверенного детерминированного механизма** кандидаты, явные правила и список доступных текущему актору ОН. Он не создаёт наследования из воздуха и не выполняет SQL, Auth0, RLS, OpenAI, HTTP или запись в граф. `composeGraphReadWithInheritanceV1` оставляет **directRelations** и **inheritedRelations** раздельными.

Каждый объект в `inheritedRelations` содержит `rule_id`, `rule_version`, `depth` (1–2), `applicability`, `applicability_code`, ссылки на исходные отношения и evidenceRefs, а также `epistemicStatus: DERIVED_CANDIDATE` и `verified: false`. Это метаданные происхождения предложения, **не подтверждение истинности отношения или доказательств**.

## Guards

- Только явно переданные правила со `status=approved`, соответствующей версией, типом связи и scope. Источник правил пока НЕ подключён к production и не верифицирован независимо.
- Для `scope=actor` обязательны `ownerUserId` и `ownerActorId`; они должны точно совпадать с owner-полями кандидата и правила. Только соседние объекты из заранее отфильтрованного авторизованного набора `visibleValueObjectIds` для того же scope; **этот модуль сам не проверяет RLS**.
- Кандидат должен иметь непустые `support_relation_ids` и `evidence_refs`, корректный `depth`, непустой `rule_id`, совпадающую область применимости.
- `needs_review` и `blocked` не считаются применённым наследованием; возвращаются отдельно как `inheritanceReview`.
- Дедупликация не смешивает разные версии правил и направление, но одинаковые кандидаты с разными evidence не сливаются в подтверждённую истину.
- Жёсткие границы: `limit <= 50`, `depth <= 2`, max 100 правил, 500 кандидатов, 300 видимых ОН. No traversal / no N+1.

## NOT done

- Нет API wiring, DB read, утверждённого live rule registry, алгоритма самостоятельного вывода и независимой проверки applicability.
- Не выполнены реальные отрицательные Auth0/RLS тесты, runtime API, p50/p95, Next.js build, Supabase migration, Git commit/push или деплой.
- Маршрут M-0195 остаётся **DISABLED**, SEC-06 OPEN_BLOCKER, release BLOCKED.
- M-0196 при локальной установке остаётся CODE/PENDING до отдельной приёмки. Этот шаг **не завершает production-интеграцию**.
