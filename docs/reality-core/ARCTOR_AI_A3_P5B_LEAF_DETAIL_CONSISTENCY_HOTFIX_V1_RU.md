# AI-A3 P5B — согласованность GLOBAL leaf detail v1

## Назначение

Последний hotfix перед закрытием P5B устраняет три несогласованности на GLOBAL/System leaf-карточке:

- ontology_node_role_code является авторитетным источником роли; legacy node_role_code больше не может одновременно делать leaf «intermediate»;
- блок параметров/целей признаёт GLOBAL semantic leaf и получает безопасную read-only пустую проекцию без actor-private assignment/target rows;
- верхний счётчик «Связанные активности» использует те же P5B источники связи, что mutual-links: activity_object_facts + active semantic_exposure/planned_target links;
- ActivityMutualLinksPanel/«Связанная реальность» не переписывается и остаётся регрессионно защищённым;
- GLOBAL edit/restructure/write права не добавляются; SQL/schema/OpenAI вызовов нет.

## Live acceptance

Открыть GLOBAL leaf «Ходьба» после deployment. Должно быть: leaf в заголовке/основных данных, параметрический блок без сообщения «это не лист», Linked activities = 1 для контрольной активности, Linked reality сохраняет активность и факт 31 minute, ACCESS_DENIED отсутствует. После PASS P5B CLOSED и следующий блок — P5C quick capture + review buffer.
