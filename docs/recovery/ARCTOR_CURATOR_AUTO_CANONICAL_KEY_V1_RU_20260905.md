# ARCTor — автоматический canonical_key для системного authoring Куратора

Дата: 2026-09-05
Релиз: `ARCTOR_CURATOR_AUTO_CANONICAL_KEY_V1`
Baseline: `2dd8c55841efa38d23d9f7a35057b478b8d1ef66`
Code commit: `fd8d4b52e39e6188d023601fe1ea3636a9cf591a`
Статус: CODE_RELEASED_AWAITING_LIVE_ACCEPTANCE

## 1. Контекст

Предыдущий `ARCTOR_CURATOR_FACETLESS_SYSTEM_OBJECT_AUTHORING_V1` получил live acceptance на production: поле Semantic facet отсутствует в украинской форме Куратора. Следующим UX-препятствием оказалось ручное поле `canonical_key`, требовавшее от сотрудника знания технической номенклатуры.

## 2. Решение

- `canonical_key` остаётся обязательным стабильным техническим идентификатором записи.
- Куратор больше не видит и не вводит canonical key в форме создания системного ОН.
- Create API больше не принимает `body.canonicalKey` как часть curator authoring contract.
- Сервер генерирует ключ детерминированно после валидации английского названия.
- Формат v1: `system.<english_slug>.<10-hex-sha256>`.
- Hash seed: node role + parent id (либо ROOT) + нормализованное английское название.
- После создания ключ не пересчитывается при переименовании или переподчинении; изменение ключа требует отдельной миграционной процедуры.
- `canonical_key` не является онтологической классификацией и не заменяет удалённый facet.

## 3. Почему hash suffix обязателен

Он убирает зависимость от стиля конкретного куратора, делает повторный request детерминированным и резко снижает риск коллизий одинаковых slug. Куратор не должен обучаться правилам namespace или придумывать `activity.* / anatomy.* / need.*`.

## 4. Изменённые source files

1. `src/app/admin/reality-curator/signals/curator-object-bootstrap.tsx`
2. `src/app/api/admin/reality-curator/signals/object-bootstrap/route.ts`

## 5. Safety boundary

- SQL migrations: 0.
- DB/Supabase writes в release-runner: 0.
- OpenAI calls: 0.
- Существующие canonical keys не переписываются.
- Существующие ОН не переименовываются и не переподчиняются.
- Legacy `facet_code/object_kind_code` compatibility из предыдущего релиза не меняется.

## 6. Проверки

- exact baseline/main/origin-main;
- clean worktree;
- exact SHA-256 source/recovery baseline files;
- Node syntax patcher/validator;
- patcher + validator self-test на копии source;
- pre/post TypeScript;
- touched ESLint 0/0;
- full ESLint no-regression;
- production build;
- `git diff --check`;
- exact changed-file allowlists;
- code commit + recovery commit + push + remote verification + clean worktree.

## 7. Live acceptance

1. Открыть `/admin/reality-curator/signals?locale=uk`.
2. Убедиться, что поля «Канонічний ключ» в create form нет.
3. Создать промежуточный ОН `Діяльність людини / Human activity` под `Actions and Processes`.
4. Создание должно пройти без ручного technical key.
5. В технической карточке допустимо увидеть сгенерированный read-only ключ вида `system.human_activity.<hash>`.
6. После PASS продолжить путь `Physical activity -> Pull-up` и затем назначение `count` / `duration`.