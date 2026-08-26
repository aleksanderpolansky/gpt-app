# ARCTor — Message Objects / Feed — Current Roadmap

Дата актуализации: 2026-08-26
Recovery baseline: `main @ bc870d1f54adf39c543be2e4b9b787640c5d29fb`

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

### F2M — Media for native publications — TODO

Добавить:

- image;
- video;
- document/link preview при необходимости;
- использовать существующий `message_object_media`;
- не менять canonical message identity.

### F3 — Enterprise Updates Feed — BASE VERSION DONE

На странице предприятия уже существует публичная хронологическая лента native ARCTor publications.

Когда появятся внешние каналы, сюда добавятся source/channel filters.

### F4 — Global ARCTor Feed — NEXT

Первая версия:

- route `/feed`;
- только `active + public` native ARCTor `message_objects`;
- только успешно доставленные в ARCTor записи;
- chronological ordering;
- карточка автора/предприятия;
- language localization переиспользует существующий on-demand cache;
- без нового feed storage layer.

После доказательства базовой версии можно добавлять subscriptions / followed businesses / interests.

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

**F4 Global ARCTor Feed v1 intake/implementation planning** на текущем `message_objects` контракте.

Не возвращаться к отдельному `Publication Core`: этот архитектурный вопрос уже закрыт.
