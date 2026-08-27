# ARCTor — Message Objects / Feed — Current Roadmap

Дата актуализации: 2026-08-26
Recovery baseline: `main @ fb754c261260e553e0c0434cba6348817a630cc4`

## Принцип

Старая концепция `Publication / Feed Item` сохранена по смыслу, но фундаментальная сущность уже реализована шире как `message_objects`.

Не создавать параллельную таблицу `publications` или фундаментальную таблицу `feed_items`.

`Feed` = read projection над `message_objects`.

## Текущее состояние

### F1 — Message Objects Core — DONE

Реализованы:

- `message_objects`;
- audience actors;
- relations;
- distributions;
- media;
- server-mediated create / activate / withdraw;
- RLS/service-role boundary;
- provenance/external identity foundation.

### F2 — Native Enterprise Publication — DONE

Production доказан:

- owner-only creation;
- organization actor = author;
- active user actor = creator;
- `audience_scope_code = public`;
- native ARCTor origin;
- one canonical `message_object`;
- one `arctor` distribution;
- Guest public read.

### F2L — Updates / Multilingual Localization — DONE

Production доказан:

- 7 локализованных UI-заголовков;
- Updates card top-right;
- per-block Suspense fallback;
- AI on-demand localization;
- translation cache in `message_objects.metadata_json.localizedContent`;
- EN cache hit после `F5`.

### F2M — Media for native publications — NEXT

Первая версия F2M:

- одна image на native enterprise publication;
- использовать существующий `message_object_media`;
- canonical `message_object` не меняется;
- исходный пользовательский файл остаётся только локально в браузере;
- до сети уходит только browser-optimized WebP;
- public message image хранится в `arctor-public-media`;
- Storage object content-addressed по SHA-256;
- server hard limit 512 KiB;
- binary image delivery не проксируется через Vercel;
- public UI получает короткий/versioned delivery URL либо redirect к Storage/CDN;
- video/document/link preview остаются следующими подэтапами.

### F3 — Enterprise Updates Feed — BASE VERSION DONE

На странице предприятия уже существует публичная хронологическая лента native ARCTor publications.

Когда появятся внешние каналы, сюда добавятся source/channel filters.

### F4 — Global ARCTor Feed — DONE

Production доказан:

- route `/feed`;
- `active + public + native + arctor` projection;
- только `arctor/succeeded` distributions;
- organization author + public/published/listed organization;
- chronological ordering;
- 7-locale UI;
- on-demand localization + cache;
- item-level Suspense: перевод одной новой публикации не скрывает cached соседние карточки;
- после `F5` cached translation появляется сразу без повторного translation pending;
- без нового feed storage layer.

Pagination/load-more остаётся расширением после появления реального объёма feed items.

### F5 — Connected Channels / OAuth — TODO

Подключаемые аккаунты:

- Facebook;
- Instagram;
- LinkedIn;
- TikTok;
- YouTube.

Нужен отдельный contract подключённого external account/token lifecycle.

### F6 — Social Import — TODO

External post:

`external source -> imported message_object -> provenance/external_item_id/canonical_url -> ARCTor read projection`

Импорт не должен маскировать внешний источник под ARCTor authorship.

### F7 — Cross-posting — TODO

Один canonical `message_object`:

- ARCTor;
- Facebook;
- Instagram;
- LinkedIn;
- TikTok;
- YouTube.

Каждая доставка = отдельный `message_object_distribution`.

Failed delivery повторяется отдельно от canonical message.

### F8 — Retail / External Feeds — TODO

Источники:

- Lidl;
- Biedronka;
- Auchan;
- другие.

Приоритет ingestion:

1. official API/partner feed;
2. RSS;
3. approved official web import;
4. affiliate/product feed;
5. scraping — только последний вариант.

External promotion становится imported `message_object` либо связанным информационным сообщением с provenance.

### F9 — Personalized Feed / AI Navigator — TODO

Фильтрация/ранжирование по:

- подпискам;
- интересам;
- используемым предприятиям;
- офертам;
- географии при разрешённом privacy contract;
- истории взаимодействий;
- AI preference rules.

## Ближайший технический шаг после closure

**F2M — image media for native enterprise publications**.

Сначала только одна фотография на публикацию и только через уже действующий media-egress/storage contract. Не возвращать Base64 в persisted state или RSC/JSON payload, не архивировать originals и не вводить Vercel binary proxy.

Не возвращаться к отдельному `Publication Core`: этот архитектурный вопрос уже закрыт.
