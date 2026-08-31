# ARCTor — Local Editors Dashboard Navigation Link V1

Дата: 2026-08-31

## Цель

Добавить постоянную ссылку на `/local-editors` в раскрытую группу «Мой кабинет / Dashboard», сразу после пункта загруженных файлов.

## Решение

- Добавлен подпункт `navigation.localEditors` под Dashboard.
- Ссылка ведёт на `/local-editors` и сохраняет текущий `locale` через существующий `localeHref()`.
- `/local-editors` входит в active-state группы Dashboard.
- Пункт доступен всем пользователям и не зависит от admin-навигации.
- Добавлены переводы RU / PL / EN / ES / UK / DE / CS.

## Изменённые production-файлы

- `src/components/app-shell/global-navigation.tsx`
- `src/i18n/messages/navigation.ts`

## Автоматические проверки

- git diff --check: PASS
- TypeScript --noEmit: PASS
- Changed-files ESLint: 0 errors / 0 warnings
- Full ESLint: no regression (244/107 -> 244/107)
- Next production build: PASS

## Browser acceptance

1. Открыть `/local-editors?locale=pl`.
2. В раскрытом `Mój panel` увидеть `Edytory lokalne` сразу после `Przesłane pliki`.
3. Нажать ссылку и подтвердить переход на `/local-editors?locale=pl`.
4. Проверить active-state Dashboard-группы и отсутствие новых ошибок Console.

## Точка продолжения

Локальные редакторы считаются завершённым пользовательским инструментом на текущем уровне. Следующие работы по ним — только по фактической необходимости.
