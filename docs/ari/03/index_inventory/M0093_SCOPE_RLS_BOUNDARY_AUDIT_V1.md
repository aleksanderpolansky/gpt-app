# M-0093 — границы глобального и персонального поискового пространства

**Приёмка:** `ACCEPTED_READONLY_SCOPE_RLS_INVENTORY_ONLY`. Это не сертификация RLS или поиска.

* Всего ОН: 803, активных: 791; изменения по сравнению с M-0092: 0 / 0.
* Глобальные кандидаты для будущей ревизии (НЕ допущенные к индексу): 739.
* Owner-private, исключить из общего индекса: 49. Классы: {"GLOBAL_MISSING_PRIVACY_OR_IDENTITY_EXCLUDE":1,"GLOBAL_PUBLIC_CANDIDATE_NOT_APPROVED":739,"INACTIVE_EXCLUDED":12,"OWNER_PRIVATE_EXCLUDE_SHARED":49,"OWNER_SCOPE_AMBIGUOUS_EXCLUDE":2}.
* RLS по таблицам: concept_aliases=true, value_object_definition_versions=true, value_objects=true; описаний политик: 2.
* Системных корней products_services: 4; без canonical_key: 2; возможных дублей корня в одном namespace: 2.
* Для этих корней отсутствие canonical_key является **ACCEPTED_DESIGN_EXCEPTION**, не ошибка обычного онтологического ключа. Дублирование структурных корней ещё НЕ признано допустимым.
* 89 ссылок алиасов на не найденные ОН остаются открытым вопросом.
* Предупреждения: OWNER_SCOPE_AMBIGUOUS, GLOBAL_METADATA_CONFLICT, SAME_OWNER_COMMERCIAL_ROOT_POSSIBLE_DUPLICATE.
* Политики и SELECT grants — лишь структура, их корректность при доступе другого пользователя и обходе через service_role не протестирована.
* Никакой общий индекс не включает owner-private данные; индексация вообще не активирована. `indexableApproved=0`; поиск `INCONCLUSIVE`.
* Без SQL writes, без вызова RPC, без исходников, commit, push или deploy.

Следующий шаг: **M-0094 — read-only ревизия семантических полей на 7 языках**.
