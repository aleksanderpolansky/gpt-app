# M-0080 — Known limitations экспериментальных словарных правил ARI-02.2

**Это документация о границах эвристического алгоритма, а не доказательство ошибки БД Supabase.**

| Код | Ограничение | Следствие |
|---|---|---|
| `ARI02-LIM-DICT-001` | BOUNDED_HARDCODED_ALIASES | Unknown terms can be unresolved even if the catalog contains a relevant ON. |
| `ARI02-LIM-DICT-002` | TOKEN_AND_PREFIX_HEURISTICS | Inflections, morphology, compound phrases and unsupported languages are not systematically handled. |
| `ARI02-LIM-DICT-003` | FACET_FROM_DISPLAY_PATH | Unknown/nonmatching path labels may produce unknown facet; display-path parsing is not a validated graph edge. |
| `ARI02-LIM-DICT-004` | UNVERIFIED_RELATION_HINTS | These hints cannot establish ontology relations, inheritance, causation, or authorize creation. |
| `ARI02-LIM-DICT-005` | COMPONENT_SCORE_WITHOUT_PHRASE_PRIORITY | Observed frozen query ночной сон: generic Сон rank 1, exact Ночной сон rank 2 (M0075). Mechanism is a plausible explanation, not a proven exclusive root cause. |
| `ARI02-LIM-DICT-006` | NOT_EXHAUSTIVE_CATALOG_OR_STATISTICAL_VALIDATION | Empty results or absence from page cannot establish ON absence; ranking is not certified by independent Gold and cannot establish Recall@20 for real catalog. |

## Отделение наблюдения от гипотезы

- **Наблюдение M-0075:** при запросе «ночной сон» в замороженной экспериментальной выдаче общий ОН «Сон» был выше точного «Ночной сон». Оба UUID и SHA зафиксированы в M-0079.
- **Гипотеза о механизме:** независимая оценка компонентов и максимум балла могут дать предпочтение общему компоненту запроса. Это не доказательство единственной причины и не результат нового живого теста.
- **Не приписывать экспериментальному режиму:** два посторонних попадания «лестница» и «длительность ходьбы» зафиксированы в baseline lexical. Для исторической пустой выдачи старый HTTP ответ отсутствует.
- **Не утверждать:** что БД повреждена, что индексированный поиск ARI-03 содержит такую же ошибку, что поиск семантически полон, что Recall@20 известен.
- **Нельзя использовать экспериментальную выдачу для автоматического создания ОН**, установления истинности отношений или решения, что объекта не существует.

`M-0080` только фиксирует known limitations. Детерминированные регрессионные fixtures разрабатываются отдельно в `M-0081`. Исправление ранжирования, миграция SQL и deployment не входят в этот этап.
