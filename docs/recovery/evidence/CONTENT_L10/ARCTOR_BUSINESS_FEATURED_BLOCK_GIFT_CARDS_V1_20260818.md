# ARCTOR BUSINESS FEATURED BLOCK + GIFT CARDS V1

Baseline: `afa4b5af56ecd5ad5395d9b54551fd6bd17742e8`

Scope:
- align the logo-card star with the Category row;
- reduce address typography hierarchy in public and edit modes;
- replace the empty third top-row card with Special offers or news + Gift cards;
- public empty state says that there are no offers yet;
- owner edit mode stays public-first in the same top-row card;
- owner can upload one image, enter one HTTPS link and one short description;
- short description is stored as localized human content in CONTENT-L10;
- image files are stored in public Supabase Storage bucket `arctor-public-media`;
- social_links_json stores only compact URL metadata under `arctor_featured_content_v1`;
- existing super-offer creation flow remains unchanged and is linked from Gift cards;
- no database schema migration.

Deferred:
- full rename of certificate/super-offer terminology across the entire UI;
- social feed integration;
- booking/calendar;
- service-area redesign;
- AI need-based category system.

Media safety:
- owner-only upload endpoint;
- JPEG/PNG/WebP only;
- 5 MB server-side limit;
- SVG excluded;
- binary image data never goes into social_links_json.
