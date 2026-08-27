# ARCTor — Mobile File Picker Viewport Recovery Hotfix V1

Дата: 2026-08-27
Release: `ARCTOR_MOBILE_FILE_PICKER_VIEWPORT_RECOVERY_HOTFIX_V1`
Baseline: `main @ 5224081d7a8a0fafd06152c36bd4da3975cf2df5`

## Новое production evidence

После успешного F2M image release и mobile image decode hotfix обнаружено более точное воспроизведение:

1. На Android Chrome открыть страницу предприятия.
2. Нажать `Фото / Zdjęcie`.
3. Открывается системный Google Photos / Android file picker.
4. НЕ выбирать файл.
5. Закрыть picker.
6. ARCTor возвращается с белой основной областью.
7. Global top bar и фиксированные кнопки AI Navigator при этом остаются видимыми.

Это исключает image decode/resize как первичную причину именно этого white-screen сценария, потому что файл вообще не выбран и `optimizePublicationImage()` не вызывается.

Предыдущий mobile decode hotfix не откатывается: он остаётся корректной защитой от full-resolution raster decode больших изображений, но относится к другому риску.

## Локализация проблемы

Текущий Global App Shell использует:

`h-screen` → CSS `100vh`

и одновременно:

- outer shell `overflow-hidden`;
- inner row `min-h-0 flex-1 overflow-hidden`;
- `<main>` как внутренний `overflow-y-auto`;
- AI mobile controls `position: fixed`.

На Android Chromium переход во внешний file-picker activity и возврат может менять / временно некорректно восстанавливать layout/visual viewport.

Если `100vh` после возврата становится некорректным, flex-area основного `<main>` может схлопнуться, в то время как top bar и `position: fixed` AI controls продолжают отображаться. Это соответствует production screenshot.

## Hotfix

Изменяется только:

`src/components/app-shell/global-app-shell.tsx`

Добавляется mobile-only runtime CSS variable:

`--arctor-app-viewport-height`

Высота берётся из:

`window.visualViewport?.height ?? window.innerHeight`

и записывается в px.

Root shell сохраняет `h-screen` как CSS fallback, но inline height использует:

`var(--arctor-app-viewport-height, 100vh)`

## Когда высота синхронизируется

- initial mount;
- `window.resize`;
- `orientationchange`;
- `visualViewport.resize`;
- `pageshow`;
- `visibilitychange` при возврате в `visible`.

После возврата используется double `requestAnimationFrame`, чтобы не фиксировать промежуточное значение viewport в тот же lifecycle tick, когда Android/Chrome возвращает страницу из внешнего picker activity.

## Scope / ограничения

Hotfix:

- не читает выбранный файл;
- не меняет media upload;
- не вызывает `router.refresh()`;
- не делает `window.location.reload()`;
- не делает fetch/network requests;
- не пишет DB/Storage;
- не меняет schema;
- не меняет desktop layout contract;
- не меняет ARCTor visual styling.

## Почему это предпочтительнее reload

Полный reload после file picker:

- создавал бы дополнительный трафик;
- мог бы потерять незавершённый текст публикации;
- маскировал бы viewport bug вместо восстановления layout.

Этот hotfix меняет только client viewport sizing и не инициирует сетевые операции.

## Production smoke

После deploy:

1. Android Chrome → Enterprise Updates.
2. Нажать `Фото`.
3. Закрыть picker БЕЗ выбора файла.
4. Страница должна остаться полностью видимой в той же позиции.
5. Повторить 3 раза.
6. Нажать `Фото`, выбрать изображение.
7. Должен появиться preview.
8. Опубликовать.
9. Проверить Enterprise Updates и `/feed`.
10. Проверить поворот portrait ↔ landscape.
11. Проверить открытие/закрытие клавиатуры в textarea.
12. Desktop page должна остаться без визуальных изменений.
