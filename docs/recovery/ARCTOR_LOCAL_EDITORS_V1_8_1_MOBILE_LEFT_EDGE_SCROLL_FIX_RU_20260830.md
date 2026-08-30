# ARCTor Local Editors V1.8.1 — mobile left-edge scroll fix

Дата: 2026-08-30
Baseline: `0e131ffaa7f5eb13b4d42a31e45b358f8b8e507f`

## Исходное состояние

V1.8 production runner завершён с PASS, commit/push/remote verify подтверждены. Standalone DOCX workspace работает корректно на desktop и сохраняет local-only contract. На смартфоне при ручном увеличении масштаба остаётся дефект: горизонтальная полоса прокрутки находится в крайнем левом положении, но фактический левый край страницы остаётся за недоступной отрицательной областью.

## Причина

V1.7.1/V1.8 уже переводили transform-origin масштабируемых контейнеров CasualOffice в `top left`. Этого недостаточно на узком viewport: внутренние flex-контейнеры CasualOffice продолжают центрировать содержимое через `align-items: center`. Когда масштабированная страница шире viewport, часть её ширины оказывается слева от нулевой координаты прокрутки. Браузер не может прокрутить `scrollLeft` в отрицательную область.

## Ошибка первого release package

Первый release package V1.8.1 был остановлен в scratch-worktree до любых изменений `main`. Функциональный patcher применился успешно, но validator ошибочно требовал дословную грамматическую форму «отрицательной области», тогда как этот checkpoint использует формы «отрицательную область» и «отрицательной областью». Это дефект контрольного правила validator, а не дефект CSS-патча. Scratch-worktree после FAIL удалён, исходный `main` остался на baseline V1.8.

В package revision R2 проверка причины сделана устойчивой к падежной форме словосочетания «отрицательная область», при этом отрицательный self-test отдельно подтверждает, что отсутствие самой причины по-прежнему блокируется.

## Решение V1.8.1

Только при активном классе `arctor-local-docx-editor--horizontal-overflow` локальный DOCX wrapper переопределяет внутреннее горизонтальное выравнивание CasualOffice:

- контейнер, непосредственным ребёнком которого является `.paged-editor__pages`, получает `align-items: flex-start !important`;
- `.paged-editor__pages` также получает `align-items: flex-start !important`;
- `transform-origin: top left !important` сохраняется на обоих уровнях.

Правило строго scoped к локальному DOCX editor и включается только когда фактический zoom превышает fit-to-width. При масштабе, помещающемся по ширине, штатное центрирование CasualOffice сохраняется.

## Что не меняется

- V1.8 standalone workspace сохраняется без изменений.
- Desktop поведение V1.7.1/V1.8 сохраняется.
- Fit-to-width и mobile auto-fit сохраняются.
- `@casualoffice/docs@1.4.2` не патчится в `node_modules`.
- SQL: 0.
- Миграции БД: 0.
- Серверное хранение документа: 0.
- Новые document-content API: 0.
- LocalStorage/SessionStorage/IndexedDB для документа: 0.

## Acceptance

1. Smartphone: открыть DOCX и развернуть редактор.
2. Увеличить масштаб выше fit-to-width, например до 115–200%.
3. Перетащить нижний горизонтальный scrollbar до крайнего левого положения.
4. Левый край страницы и начало строк должны быть полностью доступны.
5. Перетащить scrollbar вправо: правый край также доступен.
6. Нажать «За шириною/По ширине»: документ снова помещается и центрируется штатно.
7. Desktop не получает регрессии.
8. Локальное сохранение DOCX продолжает работать.
9. Console не получает новых CSP/runtime ошибок.

## Следующая точка

После production acceptance V1.8.1 закрыть текущий DOCX mobile-pan defect и перейти к XLSX Editor V1 на общем LocalEditorStandaloneFrame.
