# CONTENT-L10 / BUSINESS CONTACTS PUBLIC-FIRST INLINE EDIT V1

Baseline: `81eebeb1057b5221e9c2b224c47be5ed90a1b5fb`

Scope:
- activate Phone and Website editing inside the existing organization public-profile editor;
- replace the disabled Messenger action with a localized "Message" action;
- keep editing public-first: same visitor layout, one inline owner editor expands below the action row;
- support WhatsApp, Telegram, Signal, Viber and Custom direct-message links;
- keep social-network/feed architecture separate; contact channels are stored under
  `social_links_json.arctor_contact_channels_v1`;
- no SQL migration and no destructive data changes.

UX lock:
- no separate admin form for contacts;
- no modal for normal contact editing;
- only one contact editor section open at a time;
- owner-only extra fields flow downward below the corresponding public action;
- phone/site/contact values are not localized; only UI labels are localized.

Validation contract:
- exact Git baseline and blob hashes;
- patcher full dry-run before mutation;
- Node validator;
- Next production build;
- git diff --check and cached diff check;
- exact changed-file allowlist;
- commit/push on main;
- fail-closed rollback before commit.
