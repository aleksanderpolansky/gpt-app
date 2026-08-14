# AI-A3 P5B — мобильный каталог и локализация GLOBAL System ЦО/ОН v2

## Назначение

Hotfix завершает согласованность `/value-objects` перед P5C:

- карточки списка не создают горизонтальный overflow на смартфоне;
- GLOBAL/System объект имеет обычную ссылку «Подробнее/Открыть» на read-only detail page;
- 150 GLOBAL System canonical objects получают `title` и `description` для `en/pl/ru/uk/de/es/cs`;
- путь в каталоге и detail строится из локализованных заголовков;
- пользовательские/actor-scoped ЦО/ОН не переводятся автоматически;
- каноническая идентичность, canonical_key, факты, relations, parameters и ownership не изменяются;
- SQL, DB migration и OpenAI вызовы не нужны.

## Архитектурная граница

Локализация является read-only projection по `canonical_key`. Она не переписывает русские системные определения в БД и не создаёт новые ЦО/ОН. GLOBAL редактирование и restructure остаются запрещены.

## Live acceptance

После deployment проверить `/value-objects` на мобильной ширине и открыть один GLOBAL leaf минимум в EN/PL и текущей локали. После PASS P5B можно закрыть и перейти к P5C quick capture + review buffer.
