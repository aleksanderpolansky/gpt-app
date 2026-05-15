# P4.7.1 Schema Inventory Raw

Generated: 2026-05-15 18:44:46

Purpose: raw inventory for P4.7.1 before compatibility decision and additive VOI/state bridge design.

Important: this file is diagnostic only. It does not change schema, routes, policies or migrations.

## Git checkpoint

### git status --short

    ?? docs/p4-7-schema-inventory-raw.md

### git log --oneline -n 8

    8803bd4 Document imported pending edit audit stabilization
    c649ae9 Expose correction status in activity debug trace
    905e350 Add audit rows for imported pending event edits
    4a09793 Document imported pending template correction tests
    3a00790 Fix legacy template id in imported reject response
    ea58e7c Allow template correction for imported activity events
    70cd041 Show imported template mapping in review responses
    92a9bae Document activity template mapping P4.4

## Files scanned

Total files scanned: 158


---

## Table or term: value_objects

Referenced in files:
- .\supabase\migrations\012_activity_recording_backbone.sql (1 matches)
- .\supabase\migrations\014_activity_events_v2_template_link.sql (1 matches)
- .\src\app\api\offers\route.ts (5 matches)
- .\src\app\api\value-objects\route.ts (2 matches)
- .\src\app\offers\page.tsx (6 matches)
- .\docs\p4-7-schema-inventory-raw.md (1 matches)

### Migration / SQL / policy context


File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 4
Text:
    -- activity_links, time_blocks, value_objects, organizations, offers, certificates or points.

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 10
Text:
    -- activity_participants, activity_links, time_blocks, value_objects or commercial core.

### First code references

- .\supabase\migrations\012_activity_recording_backbone.sql:4 - -- activity_links, time_blocks, value_objects, organizations, offers, certificates or points.
- .\supabase\migrations\014_activity_events_v2_template_link.sql:10 - -- activity_participants, activity_links, time_blocks, value_objects or commercial core.
- .\src\app\api\offers\route.ts:380 - .from("value_objects")
- .\src\app\api\offers\route.ts:456 - value_objects (*),
- .\src\app\api\offers\route.ts:475 - value_objects (
- .\src\app\api\offers\route.ts:732 - value_objects (*),
- .\src\app\api\offers\route.ts:775 - value_objects (
- .\src\app\api\value-objects\route.ts:241 - .from("value_objects")
- .\src\app\api\value-objects\route.ts:315 - .from("value_objects")
- .\src\app\offers\page.tsx:34 - value_objects: ValueObject | null;
- .\src\app\offers\page.tsx:94 - value_objects: ValueObject | null;
- .\src\app\offers\page.tsx:591 - {offer.value_objects
- .\src\app\offers\page.tsx:592 - ? `${offer.value_objects.title} (${offer.value_objects.value_type})`
- .\src\app\offers\page.tsx:818 - {item.value_objects
- .\src\app\offers\page.tsx:819 - ? `${item.value_objects.title} (${item.value_objects.value_type})`
- .\docs\p4-7-schema-inventory-raw.md:39 - | value_objects | TBD | TBD | TBD | TBD | TBD | canonical / compatibility TBD |

---

## Table or term: value_object_instances

No references found.

---

## Table or term: activity_event_value_object_instance_links

No references found.

---

## Table or term: value_object_state_deltas

No references found.

---

## Table or term: value_object_state_snapshots

No references found.

---

## Table or term: value_object_daily_aggregates

No references found.

---

## Table or term: value_object_relations

No references found.

---

## Table or term: value_object_closure

No references found.

---

## Table or term: value_object_goal_profiles

No references found.

---

## Table or term: value_object_functions

No references found.

---

## Table or term: offers

Referenced in files:
- .\supabase\migrations\002_seed_object_action_rubricator.sql (7 matches)
- .\supabase\migrations\012_activity_recording_backbone.sql (1 matches)
- .\src\app\page.tsx (2 matches)
- .\src\app\admin\page.tsx (6 matches)
- .\src\app\api\availability-rules\route.ts (1 matches)
- .\src\app\api\bookings\route.ts (2 matches)
- .\src\app\api\directory\organizations\route.ts (12 matches)
- .\src\app\api\offers\route.ts (7 matches)
- .\src\app\api\public\rewards\route.ts (6 matches)
- .\src\app\availability-rules\page.tsx (6 matches)
- .\src\app\availability-rules\new\page.tsx (9 matches)
- .\src\app\bookings\page.tsx (6 matches)
- .\src\app\bookings\new\page.tsx (12 matches)
- .\src\app\certificates\new\page.tsx (3 matches)
- .\src\app\certificates\redeem\page.tsx (3 matches)
- .\src\app\directory\page.tsx (8 matches)
- .\src\app\my-certificates\page.tsx (3 matches)
- .\src\app\offers\page.tsx (15 matches)
- .\src\app\offers\available-slots\page.tsx (12 matches)
- .\src\app\offers\new\page.tsx (3 matches)
- .\src\app\organizations\page.tsx (3 matches)
- .\src\app\rewards\page.tsx (16 matches)
- .\src\app\seller-certificates\page.tsx (3 matches)
- .\docs\p4-7-schema-inventory-raw.md (1 matches)

### Migration / SQL / policy context


File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 23
Text:
    ('commercial_object', 'Commercial object', 'Products, services, offers, certificates and other sellable or exchangeable objects.', 20),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 156
Text:
    ('marketplace', 'Marketplace', 'Products, services, offers, certificates and commercial interactions.', 20),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 274
Text:
    ('offer', 'create', 'offer', true, 'Offers can be created from value objects.'),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 275
Text:
    ('offer', 'publish', 'offer', true, 'Offers can be published when ready.'),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 276
Text:
    ('offer', 'buy', 'marketplace', true, 'Offers can be bought or requested by users.'),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 277
Text:
    ('offer', 'analyze', 'finance', false, 'Offers can be analyzed for revenue, margin, points and conversion.'),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 278
Text:
    ('offer', 'classify', 'offer', true, 'Offers can be classified by object, action and context.'),

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 4
Text:
    -- activity_links, time_blocks, value_objects, organizations, offers, certificates or points.

### First code references

- .\supabase\migrations\002_seed_object_action_rubricator.sql:23 - ('commercial_object', 'Commercial object', 'Products, services, offers, certificates and other sellable or exchangeable objects.', 20),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:156 - ('marketplace', 'Marketplace', 'Products, services, offers, certificates and commercial interactions.', 20),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:274 - ('offer', 'create', 'offer', true, 'Offers can be created from value objects.'),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:275 - ('offer', 'publish', 'offer', true, 'Offers can be published when ready.'),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:276 - ('offer', 'buy', 'marketplace', true, 'Offers can be bought or requested by users.'),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:277 - ('offer', 'analyze', 'finance', false, 'Offers can be analyzed for revenue, margin, points and conversion.'),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:278 - ('offer', 'classify', 'offer', true, 'Offers can be classified by object, action and context.'),
- .\supabase\migrations\012_activity_recording_backbone.sql:4 - -- activity_links, time_blocks, value_objects, organizations, offers, certificates or points.
- .\src\app\page.tsx:222 - href="/offers"
- .\src\app\page.tsx:225 - <span className="font-semibold">Offers</span>
- .\src\app\admin\page.tsx:46 - "Open the public business directory and verify how organizations, categories and offers are visible to users.",
- .\src\app\admin\page.tsx:57 - title: "Offers",
- .\src\app\admin\page.tsx:58 - href: "/offers",
- .\src\app\admin\page.tsx:60 - "Open offers and commercial objects connected to organizations, certificates and public directory pages.",
- .\src\app\admin\page.tsx:61 - badge: "Offers",
- .\src\app\admin\page.tsx:294 - directory checks, organizations and offers.
- .\src\app\api\availability-rules\route.ts:117 - offers (*),
- .\src\app\api\bookings\route.ts:167 - offers (*),
- .\src\app\api\bookings\route.ts:228 - .from("offers")
- .\src\app\api\directory\organizations\route.ts:8 - | "hasOffers"
- .\src\app\api\directory\organizations\route.ts:110 - activeOffersCount: number;
- .\src\app\api\directory\organizations\route.ts:270 - normalizedValue === "hasOffers" ||
- .\src\app\api\directory\organizations\route.ts:422 - activeOffersCount: 0,
- .\src\app\api\directory\organizations\route.ts:458 - const { data: offers, error } = await supabase
- .\src\app\api\directory\organizations\route.ts:459 - .from("offers")
- .\src\app\api\directory\organizations\route.ts:479 - const offerRows = (offers as unknown as OfferActionRow[] | null) ?? [];
- .\src\app\api\directory\organizations\route.ts:494 - currentStats.activeOffersCount += 1;
- .\src\app\api\directory\organizations\route.ts:775 - activeOffersCount: actionStats.activeOffersCount,
- .\src\app\api\directory\organizations\route.ts:777 - hasActiveOffers: actionStats.activeOffersCount > 0,
- .\src\app\api\directory\organizations\route.ts:883 - if (actionFilter === "hasOffers") {
- .\src\app\api\directory\organizations\route.ts:884 - return actionStats.activeOffersCount > 0;
- .\src\app\api\offers\route.ts:451 - const { data: offers, error: offersError } = await supabase
- .\src\app\api\offers\route.ts:452 - .from("offers")
- .\src\app\api\offers\route.ts:488 - if (offersError) {
- .\src\app\api\offers\route.ts:489 - return NextResponse.json({ error: offersError.message }, { status: 500 });
- .\src\app\api\offers\route.ts:494 - offers,
- .\src\app\api\offers\route.ts:669 - .from("offers")
- .\src\app\api\offers\route.ts:786 - await supabase.from("offers").delete().eq("id", offer.id);
- .\src\app\api\public\rewards\route.ts:83 - const { data: rewardOffers, error: rewardOffersError } = await supabase
- .\src\app\api\public\rewards\route.ts:84 - .from("offers")

Code references truncated. Total matches: 147

---

## Table or term: certificates

Referenced in files:
- .\supabase\migrations\002_seed_object_action_rubricator.sql (10 matches)
- .\supabase\migrations\012_activity_recording_backbone.sql (1 matches)
- .\src\app\admin\page.tsx (1 matches)
- .\src\app\api\certificates\expire-due\route.ts (7 matches)
- .\src\app\api\directory\organizations\route.ts (9 matches)
- .\src\app\api\offers\route.ts (5 matches)
- .\src\app\api\public\rewards\route.ts (4 matches)
- .\src\app\certificates\new\page.tsx (5 matches)
- .\src\app\certificates\redeem\page.tsx (6 matches)
- .\src\app\directory\page.tsx (10 matches)
- .\src\app\my-certificates\page.tsx (23 matches)
- .\src\app\my-certificates\components\CancelCertificateButton.tsx (1 matches)
- .\src\app\my-certificates\components\ShowCertificateQrButton.tsx (2 matches)
- .\src\app\offers\page.tsx (4 matches)
- .\src\app\offers\new\page.tsx (11 matches)
- .\src\app\rewards\page.tsx (5 matches)
- .\src\app\rewards\components\RequestCertificateButton.tsx (1 matches)
- .\src\app\seller-certificates\page.tsx (28 matches)
- .\src\app\seller-certificates\components\RedeemCertificateButton.tsx (1 matches)
- .\src\app\value-objects\page.tsx (1 matches)
- .\docs\p4-7-schema-inventory-raw.md (1 matches)

### Migration / SQL / policy context


File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 23
Text:
    ('commercial_object', 'Commercial object', 'Products, services, offers, certificates and other sellable or exchangeable objects.', 20),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 27
Text:
    ('learning', 'Learning', 'Learning sessions, language practice, exams, certificates and knowledge items.', 60),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 156
Text:
    ('marketplace', 'Marketplace', 'Products, services, offers, certificates and commercial interactions.', 20),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 218
Text:
    ('learning', 'exam-preparation', 'Exam preparation', 'Intermediate exams, certificates and structured testing.', 30),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 233
Text:
    ('loyalty', 'certificates-and-rewards', 'Certificates and rewards', 'Certificates, rewards, vouchers and redemption logic.', 20),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 280
Text:
    ('certificate', 'buy', 'certificate', true, 'Certificates can be purchased or requested.'),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 281
Text:
    ('certificate', 'confirm', 'certificate', true, 'Certificates can require seller confirmation.'),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 282
Text:
    ('certificate', 'redeem', 'certificate', true, 'Certificates can be redeemed by QR or redeem code.'),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 283
Text:
    ('certificate', 'analyze', 'loyalty', false, 'Certificates can be analyzed for loyalty, retention and breakage.'),

File: .\supabase\migrations\002_seed_object_action_rubricator.sql
Line: 292
Text:
    ('points_transaction', 'spend_points', 'loyalty', true, 'Points can be spent on certificates or rewards.'),

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 4
Text:
    -- activity_links, time_blocks, value_objects, organizations, offers, certificates or points.

### First code references

- .\supabase\migrations\002_seed_object_action_rubricator.sql:23 - ('commercial_object', 'Commercial object', 'Products, services, offers, certificates and other sellable or exchangeable objects.', 20),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:27 - ('learning', 'Learning', 'Learning sessions, language practice, exams, certificates and knowledge items.', 60),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:156 - ('marketplace', 'Marketplace', 'Products, services, offers, certificates and commercial interactions.', 20),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:218 - ('learning', 'exam-preparation', 'Exam preparation', 'Intermediate exams, certificates and structured testing.', 30),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:233 - ('loyalty', 'certificates-and-rewards', 'Certificates and rewards', 'Certificates, rewards, vouchers and redemption logic.', 20),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:280 - ('certificate', 'buy', 'certificate', true, 'Certificates can be purchased or requested.'),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:281 - ('certificate', 'confirm', 'certificate', true, 'Certificates can require seller confirmation.'),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:282 - ('certificate', 'redeem', 'certificate', true, 'Certificates can be redeemed by QR or redeem code.'),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:283 - ('certificate', 'analyze', 'loyalty', false, 'Certificates can be analyzed for loyalty, retention and breakage.'),
- .\supabase\migrations\002_seed_object_action_rubricator.sql:292 - ('points_transaction', 'spend_points', 'loyalty', true, 'Points can be spent on certificates or rewards.'),
- .\supabase\migrations\012_activity_recording_backbone.sql:4 - -- activity_links, time_blocks, value_objects, organizations, offers, certificates or points.
- .\src\app\admin\page.tsx:60 - "Open offers and commercial objects connected to organizations, certificates and public directory pages.",
- .\src\app\api\certificates\expire-due\route.ts:44 - async function expireDueCertificates() {
- .\src\app\api\certificates\expire-due\route.ts:45 - const { data: expiredCertificates, error: expireError } = await supabase.rpc(
- .\src\app\api\certificates\expire-due\route.ts:46 - "expire_due_certificates"
- .\src\app\api\certificates\expire-due\route.ts:60 - (expiredCertificates as ExpiredCertificateResult[] | null) ?? [];
- .\src\app\api\certificates\expire-due\route.ts:65 - expiredCertificates: results,
- .\src\app\api\certificates\expire-due\route.ts:80 - return expireDueCertificates();
- .\src\app\api\certificates\expire-due\route.ts:94 - return expireDueCertificates();
- .\src\app\api\directory\organizations\route.ts:9 - | "hasCertificates"
- .\src\app\api\directory\organizations\route.ts:111 - activeCertificatesCount: number;
- .\src\app\api\directory\organizations\route.ts:271 - normalizedValue === "hasCertificates" ||
- .\src\app\api\directory\organizations\route.ts:423 - activeCertificatesCount: 0,
- .\src\app\api\directory\organizations\route.ts:497 - currentStats.activeCertificatesCount += 1;
- .\src\app\api\directory\organizations\route.ts:776 - activeCertificatesCount: actionStats.activeCertificatesCount,
- .\src\app\api\directory\organizations\route.ts:778 - hasActiveCertificates: actionStats.activeCertificatesCount > 0,
- .\src\app\api\directory\organizations\route.ts:887 - if (actionFilter === "hasCertificates") {
- .\src\app\api\directory\organizations\route.ts:888 - return actionStats.activeCertificatesCount > 0;
- .\src\app\api\offers\route.ts:575 - const maxCertificatesTotal = parseOptionalInteger(body.maxCertificatesTotal);
- .\src\app\api\offers\route.ts:576 - const maxCertificatesPerUser = parseOptionalInteger(
- .\src\app\api\offers\route.ts:577 - body.maxCertificatesPerUser
- .\src\app\api\offers\route.ts:718 - max_certificates_total: maxCertificatesTotal,
- .\src\app\api\offers\route.ts:719 - max_certificates_per_user: maxCertificatesPerUser,
- .\src\app\api\public\rewards\route.ts:48 - max_certificates_total: number | null;
- .\src\app\api\public\rewards\route.ts:49 - max_certificates_per_user: number | null;
- .\src\app\api\public\rewards\route.ts:109 - max_certificates_total,
- .\src\app\api\public\rewards\route.ts:110 - max_certificates_per_user,
- .\src\app\certificates\new\page.tsx:33 - max_certificates_total: number | null;
- .\src\app\certificates\new\page.tsx:101 - max_certificates_total,
- .\src\app\certificates\new\page.tsx:604 - {offer.max_certificates_total ? (

Code references truncated. Total matches: 136

---

## Table or term: purchase_confirmations

Referenced in files:
- .\src\app\api\my\purchase-confirmations\route.ts (1 matches)
- .\src\app\api\public\purchase-history\route.ts (2 matches)
- .\src\app\api\purchase-confirmations\route.ts (1 matches)
- .\src\app\my-purchase-confirmations\page.tsx (1 matches)
- .\src\app\purchase-confirmations\page.tsx (1 matches)
- .\docs\p4-7-schema-inventory-raw.md (1 matches)

### Migration / SQL / policy context

No direct SQL or policy context found in matched lines.

### First code references

- .\src\app\api\my\purchase-confirmations\route.ts:56 - .from("purchase_confirmations")
- .\src\app\api\public\purchase-history\route.ts:148 - .from("purchase_confirmations")
- .\src\app\api\public\purchase-history\route.ts:167 - app_users!purchase_confirmations_buyer_user_id_fkey (
- .\src\app\api\purchase-confirmations\route.ts:168 - .from("purchase_confirmations")
- .\src\app\my-purchase-confirmations\page.tsx:99 - .from("purchase_confirmations")
- .\src\app\purchase-confirmations\page.tsx:131 - .from("purchase_confirmations")
- .\docs\p4-7-schema-inventory-raw.md:42 - | purchase_confirmations | TBD | TBD | TBD | TBD | do not break public masked history | additive trust/value links only |

---

## Table or term: points_transactions

Referenced in files:
- .\src\app\api\points\transactions\route.ts (1 matches)

### Migration / SQL / policy context

No direct SQL or policy context found in matched lines.

### First code references

- .\src\app\api\points\transactions\route.ts:64 - .from("points_transactions")

---

## Table or term: user_points_wallets

Referenced in files:
- .\src\app\api\points\wallet\route.ts (1 matches)

### Migration / SQL / policy context

No direct SQL or policy context found in matched lines.

### First code references

- .\src\app\api\points\wallet\route.ts:55 - .from("user_points_wallets")

---

## Table or term: activity_events

Referenced in files:
- .\supabase\migrations\012_activity_recording_backbone.sql (27 matches)
- .\supabase\migrations\014_activity_events_v2_template_link.sql (20 matches)
- .\supabase\migrations\019_activity_security_foundation.sql (4 matches)
- .\supabase\migrations\020_activity_raw_signals.sql (2 matches)
- .\supabase\migrations\021_activity_processing_logs.sql (1 matches)
- .\src\app\api\activity\complete\route.ts (3 matches)
- .\src\app\api\activity\day-summary\route.ts (1 matches)
- .\src\app\api\activity\debug-trace\route.ts (3 matches)
- .\src\app\api\activity\events\route.ts (1 matches)
- .\src\app\api\activity\intake\events\route.ts (1 matches)
- .\src\app\api\activity\record\route.ts (4 matches)
- .\src\app\api\activity\start\route.ts (2 matches)
- .\docs\activity-template-mapping-p4-4.md (3 matches)
- .\docs\p4-7-schema-inventory-raw.md (1 matches)

### Migration / SQL / policy context


File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 7
Text:
    -- one user action is recorded once in activity_events;

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 82
Text:
    create table if not exists public.activity_events (

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 104
Text:
    constraint activity_events_duration_check

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 106
Text:
    constraint activity_events_time_order_check

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 108
Text:
    constraint activity_events_source_check

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 110
Text:
    constraint activity_events_status_check

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 112
Text:
    constraint activity_events_privacy_scope_check

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 114
Text:
    constraint activity_events_processing_status_check

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 118
Text:
    drop trigger if exists trg_activity_events_updated_at on public.activity_events;

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 120
Text:
    create trigger trg_activity_events_updated_at

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 121
Text:
    before update on public.activity_events

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 127
Text:
    event_id uuid not null references public.activity_events(id) on delete cascade,

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 188
Text:
    event_id uuid not null references public.activity_events(id) on delete cascade,

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 219
Text:
    last_event_id uuid references public.activity_events(id),

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 245
Text:
    last_event_id uuid references public.activity_events(id),

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 265
Text:
    create index if not exists idx_activity_events_user_created_at

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 266
Text:
    on public.activity_events(user_id, created_at desc);

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 268
Text:
    create index if not exists idx_activity_events_user_started_at

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 269
Text:
    on public.activity_events(user_id, started_at desc);

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 271
Text:
    create index if not exists idx_activity_events_code

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 272
Text:
    on public.activity_events(event_code);

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 274
Text:
    create index if not exists idx_activity_events_template_id

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 275
Text:
    on public.activity_events(template_id);

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 757
Text:
    comment on table public.activity_events is

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 761
Text:
    'Universal links from activity_events to value objects, contexts, observed objects, actors or other entities.';

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 767
Text:
    'Concrete calculated impacts created from activity_events, usually by applying impact_rules.';

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 773
Text:
    'Per-user daily aggregate metrics derived from activity_events and impact_events.';

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 1
Text:
    -- 014_activity_events_v2_template_link.sql

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 5
Text:
    -- activity_events.template_id from migration 012 points to legacy activity_code_templates.

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 7
Text:
    -- Therefore we add activity_events.activity_template_id instead of overloading template_id.

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 14
Text:
    alter table public.activity_events

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 19
Text:
    create index if not exists idx_activity_events_activity_template_id

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 20
Text:
    on public.activity_events(activity_template_id);

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 22
Text:
    drop trigger if exists trg_activity_events_updated_at on public.activity_events;

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 24
Text:
    create trigger trg_activity_events_updated_at

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 25
Text:
    before update on public.activity_events

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 29
Text:
    alter table public.activity_events

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 30
Text:
    drop constraint if exists activity_events_source_check;

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 32
Text:
    alter table public.activity_events

File: .\supabase\migrations\014_activity_events_v2_template_link.sql
Line: 33
Text:
    add constraint activity_events_source_check

SQL/policy context truncated. Total SQL/policy matches: 54

### First code references

- .\supabase\migrations\012_activity_recording_backbone.sql:7 - -- one user action is recorded once in activity_events;
- .\supabase\migrations\012_activity_recording_backbone.sql:82 - create table if not exists public.activity_events (
- .\supabase\migrations\012_activity_recording_backbone.sql:104 - constraint activity_events_duration_check
- .\supabase\migrations\012_activity_recording_backbone.sql:106 - constraint activity_events_time_order_check
- .\supabase\migrations\012_activity_recording_backbone.sql:108 - constraint activity_events_source_check
- .\supabase\migrations\012_activity_recording_backbone.sql:110 - constraint activity_events_status_check
- .\supabase\migrations\012_activity_recording_backbone.sql:112 - constraint activity_events_privacy_scope_check
- .\supabase\migrations\012_activity_recording_backbone.sql:114 - constraint activity_events_processing_status_check
- .\supabase\migrations\012_activity_recording_backbone.sql:118 - drop trigger if exists trg_activity_events_updated_at on public.activity_events;
- .\supabase\migrations\012_activity_recording_backbone.sql:120 - create trigger trg_activity_events_updated_at
- .\supabase\migrations\012_activity_recording_backbone.sql:121 - before update on public.activity_events
- .\supabase\migrations\012_activity_recording_backbone.sql:127 - event_id uuid not null references public.activity_events(id) on delete cascade,
- .\supabase\migrations\012_activity_recording_backbone.sql:188 - event_id uuid not null references public.activity_events(id) on delete cascade,
- .\supabase\migrations\012_activity_recording_backbone.sql:219 - last_event_id uuid references public.activity_events(id),
- .\supabase\migrations\012_activity_recording_backbone.sql:245 - last_event_id uuid references public.activity_events(id),
- .\supabase\migrations\012_activity_recording_backbone.sql:265 - create index if not exists idx_activity_events_user_created_at
- .\supabase\migrations\012_activity_recording_backbone.sql:266 - on public.activity_events(user_id, created_at desc);
- .\supabase\migrations\012_activity_recording_backbone.sql:268 - create index if not exists idx_activity_events_user_started_at
- .\supabase\migrations\012_activity_recording_backbone.sql:269 - on public.activity_events(user_id, started_at desc);
- .\supabase\migrations\012_activity_recording_backbone.sql:271 - create index if not exists idx_activity_events_code
- .\supabase\migrations\012_activity_recording_backbone.sql:272 - on public.activity_events(event_code);
- .\supabase\migrations\012_activity_recording_backbone.sql:274 - create index if not exists idx_activity_events_template_id
- .\supabase\migrations\012_activity_recording_backbone.sql:275 - on public.activity_events(template_id);
- .\supabase\migrations\012_activity_recording_backbone.sql:757 - comment on table public.activity_events is
- .\supabase\migrations\012_activity_recording_backbone.sql:761 - 'Universal links from activity_events to value objects, contexts, observed objects, actors or other entities.';
- .\supabase\migrations\012_activity_recording_backbone.sql:767 - 'Concrete calculated impacts created from activity_events, usually by applying impact_rules.';
- .\supabase\migrations\012_activity_recording_backbone.sql:773 - 'Per-user daily aggregate metrics derived from activity_events and impact_events.';
- .\supabase\migrations\014_activity_events_v2_template_link.sql:1 - -- 014_activity_events_v2_template_link.sql
- .\supabase\migrations\014_activity_events_v2_template_link.sql:5 - -- activity_events.template_id from migration 012 points to legacy activity_code_templates.
- .\supabase\migrations\014_activity_events_v2_template_link.sql:7 - -- Therefore we add activity_events.activity_template_id instead of overloading template_id.
- .\supabase\migrations\014_activity_events_v2_template_link.sql:14 - alter table public.activity_events
- .\supabase\migrations\014_activity_events_v2_template_link.sql:19 - create index if not exists idx_activity_events_activity_template_id
- .\supabase\migrations\014_activity_events_v2_template_link.sql:20 - on public.activity_events(activity_template_id);
- .\supabase\migrations\014_activity_events_v2_template_link.sql:22 - drop trigger if exists trg_activity_events_updated_at on public.activity_events;
- .\supabase\migrations\014_activity_events_v2_template_link.sql:24 - create trigger trg_activity_events_updated_at
- .\supabase\migrations\014_activity_events_v2_template_link.sql:25 - before update on public.activity_events
- .\supabase\migrations\014_activity_events_v2_template_link.sql:29 - alter table public.activity_events
- .\supabase\migrations\014_activity_events_v2_template_link.sql:30 - drop constraint if exists activity_events_source_check;
- .\supabase\migrations\014_activity_events_v2_template_link.sql:32 - alter table public.activity_events
- .\supabase\migrations\014_activity_events_v2_template_link.sql:33 - add constraint activity_events_source_check

Code references truncated. Total matches: 73

---

## Table or term: event_links

Referenced in files:
- .\supabase\migrations\012_activity_recording_backbone.sql (12 matches)
- .\supabase\migrations\019_activity_security_foundation.sql (4 matches)
- .\src\app\api\activity\debug-trace\route.ts (1 matches)
- .\src\app\api\activity\events\route.ts (1 matches)
- .\src\app\api\activity\record\route.ts (1 matches)
- .\src\app\api\activity\start\route.ts (1 matches)

### Migration / SQL / policy context


File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 9
Text:
    -- through event_links, impact_events, snapshots and aggregates.

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 125
Text:
    create table if not exists public.event_links (

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 138
Text:
    constraint event_links_entity_presence_check

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 140
Text:
    constraint event_links_confidence_check

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 142
Text:
    constraint event_links_source_check

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 277
Text:
    create index if not exists idx_event_links_event_id

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 278
Text:
    on public.event_links(event_id);

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 280
Text:
    create index if not exists idx_event_links_linked_entity

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 281
Text:
    on public.event_links(linked_entity_type, linked_entity_id);

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 283
Text:
    create index if not exists idx_event_links_linked_key

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 284
Text:
    on public.event_links(linked_entity_type, linked_entity_key);

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 760
Text:
    comment on table public.event_links is

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 13
Text:
    alter table public.event_links enable row level security;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 27
Text:
    revoke all on table public.event_links from anon, authenticated;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 43
Text:
    drop policy if exists "No direct public event links access" on public.event_links;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 45
Text:
    on public.event_links

### First code references

- .\supabase\migrations\012_activity_recording_backbone.sql:9 - -- through event_links, impact_events, snapshots and aggregates.
- .\supabase\migrations\012_activity_recording_backbone.sql:125 - create table if not exists public.event_links (
- .\supabase\migrations\012_activity_recording_backbone.sql:138 - constraint event_links_entity_presence_check
- .\supabase\migrations\012_activity_recording_backbone.sql:140 - constraint event_links_confidence_check
- .\supabase\migrations\012_activity_recording_backbone.sql:142 - constraint event_links_source_check
- .\supabase\migrations\012_activity_recording_backbone.sql:277 - create index if not exists idx_event_links_event_id
- .\supabase\migrations\012_activity_recording_backbone.sql:278 - on public.event_links(event_id);
- .\supabase\migrations\012_activity_recording_backbone.sql:280 - create index if not exists idx_event_links_linked_entity
- .\supabase\migrations\012_activity_recording_backbone.sql:281 - on public.event_links(linked_entity_type, linked_entity_id);
- .\supabase\migrations\012_activity_recording_backbone.sql:283 - create index if not exists idx_event_links_linked_key
- .\supabase\migrations\012_activity_recording_backbone.sql:284 - on public.event_links(linked_entity_type, linked_entity_key);
- .\supabase\migrations\012_activity_recording_backbone.sql:760 - comment on table public.event_links is
- .\supabase\migrations\019_activity_security_foundation.sql:13 - alter table public.event_links enable row level security;
- .\supabase\migrations\019_activity_security_foundation.sql:27 - revoke all on table public.event_links from anon, authenticated;
- .\supabase\migrations\019_activity_security_foundation.sql:43 - drop policy if exists "No direct public event links access" on public.event_links;
- .\supabase\migrations\019_activity_security_foundation.sql:45 - on public.event_links
- .\src\app\api\activity\debug-trace\route.ts:582 - table: "event_links",
- .\src\app\api\activity\events\route.ts:356 - .from("event_links")
- .\src\app\api\activity\record\route.ts:1050 - ? await supabase.from("event_links").insert(eventLinkRows).select()
- .\src\app\api\activity\start\route.ts:757 - ? await supabase.from("event_links").insert(eventLinkRows).select()

---

## Table or term: impact_events

Referenced in files:
- .\supabase\migrations\012_activity_recording_backbone.sql (11 matches)
- .\supabase\migrations\017_activity_corrections.sql (2 matches)
- .\supabase\migrations\019_activity_security_foundation.sql (4 matches)
- .\src\app\api\activity\complete\route.ts (1 matches)
- .\src\app\api\activity\debug-trace\route.ts (1 matches)
- .\src\app\api\activity\events\route.ts (1 matches)
- .\lib\activity\activityImpactProcessor.ts (4 matches)
- .\docs\activity-template-mapping-p4-4.md (2 matches)

### Migration / SQL / policy context


File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 9
Text:
    -- through event_links, impact_events, snapshots and aggregates.

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 186
Text:
    create table if not exists public.impact_events (

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 202
Text:
    constraint impact_events_direction_check

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 204
Text:
    constraint impact_events_source_check

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 206
Text:
    constraint impact_events_confidence_check

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 286
Text:
    create index if not exists idx_impact_events_event_id

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 287
Text:
    on public.impact_events(event_id);

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 289
Text:
    create index if not exists idx_impact_events_target_metric

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 290
Text:
    on public.impact_events(impact_target_type, impact_target_key, impact_metric);

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 766
Text:
    comment on table public.impact_events is

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 773
Text:
    'Per-user daily aggregate metrics derived from activity_events and impact_events.';

File: .\supabase\migrations\017_activity_corrections.sql
Line: 15
Text:
    previous_impact_events_json jsonb not null default '[]'::jsonb,

File: .\supabase\migrations\017_activity_corrections.sql
Line: 94
Text:
    comment on column public.activity_corrections.previous_impact_events_json is

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 15
Text:
    alter table public.impact_events enable row level security;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 28
Text:
    revoke all on table public.impact_events from anon, authenticated;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 51
Text:
    drop policy if exists "No direct public impact events access" on public.impact_events;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 53
Text:
    on public.impact_events

### First code references

- .\supabase\migrations\012_activity_recording_backbone.sql:9 - -- through event_links, impact_events, snapshots and aggregates.
- .\supabase\migrations\012_activity_recording_backbone.sql:186 - create table if not exists public.impact_events (
- .\supabase\migrations\012_activity_recording_backbone.sql:202 - constraint impact_events_direction_check
- .\supabase\migrations\012_activity_recording_backbone.sql:204 - constraint impact_events_source_check
- .\supabase\migrations\012_activity_recording_backbone.sql:206 - constraint impact_events_confidence_check
- .\supabase\migrations\012_activity_recording_backbone.sql:286 - create index if not exists idx_impact_events_event_id
- .\supabase\migrations\012_activity_recording_backbone.sql:287 - on public.impact_events(event_id);
- .\supabase\migrations\012_activity_recording_backbone.sql:289 - create index if not exists idx_impact_events_target_metric
- .\supabase\migrations\012_activity_recording_backbone.sql:290 - on public.impact_events(impact_target_type, impact_target_key, impact_metric);
- .\supabase\migrations\012_activity_recording_backbone.sql:766 - comment on table public.impact_events is
- .\supabase\migrations\012_activity_recording_backbone.sql:773 - 'Per-user daily aggregate metrics derived from activity_events and impact_events.';
- .\supabase\migrations\017_activity_corrections.sql:15 - previous_impact_events_json jsonb not null default '[]'::jsonb,
- .\supabase\migrations\017_activity_corrections.sql:94 - comment on column public.activity_corrections.previous_impact_events_json is
- .\supabase\migrations\019_activity_security_foundation.sql:15 - alter table public.impact_events enable row level security;
- .\supabase\migrations\019_activity_security_foundation.sql:28 - revoke all on table public.impact_events from anon, authenticated;
- .\supabase\migrations\019_activity_security_foundation.sql:51 - drop policy if exists "No direct public impact events access" on public.impact_events;
- .\supabase\migrations\019_activity_security_foundation.sql:53 - on public.impact_events
- .\src\app\api\activity\complete\route.ts:202 - .from("impact_events")
- .\src\app\api\activity\debug-trace\route.ts:571 - table: "impact_events",
- .\src\app\api\activity\events\route.ts:371 - .from("impact_events")
- .\lib\activity\activityImpactProcessor.ts:247 - .from("impact_events")
- .\lib\activity\activityImpactProcessor.ts:263 - .from("impact_events")
- .\lib\activity\activityImpactProcessor.ts:277 - .from("impact_events")
- .\lib\activity\activityImpactProcessor.ts:808 - ? await supabase.from("impact_events").insert(impactRows).select()
- .\docs\activity-template-mapping-p4-4.md:184 - - real impact_events fields are impact_target_type, impact_metric, impact_unit, etc.
- .\docs\activity-template-mapping-p4-4.md:242 - - matching impact_rules create impact_events, daily aggregates and current snapshots

---

## Table or term: daily_aggregates

Referenced in files:
- .\supabase\migrations\012_activity_recording_backbone.sql (11 matches)
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql (7 matches)
- .\supabase\migrations\017_activity_corrections.sql (2 matches)
- .\supabase\migrations\019_activity_security_foundation.sql (4 matches)
- .\src\app\activity-today\page.tsx (1 matches)
- .\src\app\api\activity\day-summary\route.ts (1 matches)

### Migration / SQL / policy context


File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 234
Text:
    create table if not exists public.daily_aggregates (

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 249
Text:
    constraint daily_aggregates_source_check

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 251
Text:
    constraint daily_aggregates_user_date_metric_unique

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 255
Text:
    drop trigger if exists trg_daily_aggregates_updated_at on public.daily_aggregates;

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 257
Text:
    create trigger trg_daily_aggregates_updated_at

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 258
Text:
    before update on public.daily_aggregates

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 295
Text:
    create index if not exists idx_daily_aggregates_user_date

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 296
Text:
    on public.daily_aggregates(user_id, aggregate_date desc);

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 298
Text:
    create index if not exists idx_daily_aggregates_user_type_date

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 299
Text:
    on public.daily_aggregates(user_id, aggregate_type, aggregate_date desc);

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 772
Text:
    comment on table public.daily_aggregates is

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 1
Text:
    create unique index if not exists daily_aggregates_user_date_type_key_metric_uidx

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 2
Text:
    on public.daily_aggregates (

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 30
Text:
    returns public.daily_aggregates

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 35
Text:
    v_row public.daily_aggregates;

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 37
Text:
    insert into public.daily_aggregates (

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 70
Text:
    coalesce(public.daily_aggregates.metric_value_numeric, 0)

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 76
Text:
    coalesce(public.daily_aggregates.metadata_json, '{}'::jsonb)

File: .\supabase\migrations\017_activity_corrections.sql
Line: 16
Text:
    previous_daily_aggregates_json jsonb not null default '[]'::jsonb,

File: .\supabase\migrations\017_activity_corrections.sql
Line: 97
Text:
    comment on column public.activity_corrections.previous_daily_aggregates_json is

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 17
Text:
    alter table public.daily_aggregates enable row level security;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 30
Text:
    revoke all on table public.daily_aggregates from anon, authenticated;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 67
Text:
    drop policy if exists "No direct public daily aggregates access" on public.daily_aggregates;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 69
Text:
    on public.daily_aggregates

### First code references

- .\supabase\migrations\012_activity_recording_backbone.sql:234 - create table if not exists public.daily_aggregates (
- .\supabase\migrations\012_activity_recording_backbone.sql:249 - constraint daily_aggregates_source_check
- .\supabase\migrations\012_activity_recording_backbone.sql:251 - constraint daily_aggregates_user_date_metric_unique
- .\supabase\migrations\012_activity_recording_backbone.sql:255 - drop trigger if exists trg_daily_aggregates_updated_at on public.daily_aggregates;
- .\supabase\migrations\012_activity_recording_backbone.sql:257 - create trigger trg_daily_aggregates_updated_at
- .\supabase\migrations\012_activity_recording_backbone.sql:258 - before update on public.daily_aggregates
- .\supabase\migrations\012_activity_recording_backbone.sql:295 - create index if not exists idx_daily_aggregates_user_date
- .\supabase\migrations\012_activity_recording_backbone.sql:296 - on public.daily_aggregates(user_id, aggregate_date desc);
- .\supabase\migrations\012_activity_recording_backbone.sql:298 - create index if not exists idx_daily_aggregates_user_type_date
- .\supabase\migrations\012_activity_recording_backbone.sql:299 - on public.daily_aggregates(user_id, aggregate_type, aggregate_date desc);
- .\supabase\migrations\012_activity_recording_backbone.sql:772 - comment on table public.daily_aggregates is
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:1 - create unique index if not exists daily_aggregates_user_date_type_key_metric_uidx
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:2 - on public.daily_aggregates (
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:30 - returns public.daily_aggregates
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:35 - v_row public.daily_aggregates;
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:37 - insert into public.daily_aggregates (
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:70 - coalesce(public.daily_aggregates.metric_value_numeric, 0)
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:76 - coalesce(public.daily_aggregates.metadata_json, '{}'::jsonb)
- .\supabase\migrations\017_activity_corrections.sql:16 - previous_daily_aggregates_json jsonb not null default '[]'::jsonb,
- .\supabase\migrations\017_activity_corrections.sql:97 - comment on column public.activity_corrections.previous_daily_aggregates_json is
- .\supabase\migrations\019_activity_security_foundation.sql:17 - alter table public.daily_aggregates enable row level security;
- .\supabase\migrations\019_activity_security_foundation.sql:30 - revoke all on table public.daily_aggregates from anon, authenticated;
- .\supabase\migrations\019_activity_security_foundation.sql:67 - drop policy if exists "No direct public daily aggregates access" on public.daily_aggregates;
- .\supabase\migrations\019_activity_security_foundation.sql:69 - on public.daily_aggregates
- .\src\app\activity-today\page.tsx:2336 - Grouped summary from daily_aggregates.
- .\src\app\api\activity\day-summary\route.ts:535 - .from("daily_aggregates")

---

## Table or term: current_snapshots

Referenced in files:
- .\supabase\migrations\012_activity_recording_backbone.sql (8 matches)
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql (10 matches)
- .\supabase\migrations\017_activity_corrections.sql (1 matches)
- .\supabase\migrations\019_activity_security_foundation.sql (4 matches)
- .\src\app\activity-today\page.tsx (1 matches)
- .\src\app\api\activity\day-summary\route.ts (1 matches)
- .\lib\activity\activityImpactProcessor.ts (1 matches)

### Migration / SQL / policy context


File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 210
Text:
    create table if not exists public.current_snapshots (

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 223
Text:
    constraint current_snapshots_user_entity_metric_unique

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 227
Text:
    drop trigger if exists trg_current_snapshots_updated_at on public.current_snapshots;

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 229
Text:
    create trigger trg_current_snapshots_updated_at

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 230
Text:
    before update on public.current_snapshots

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 292
Text:
    create index if not exists idx_current_snapshots_user_entity

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 293
Text:
    on public.current_snapshots(user_id, snapshot_entity_type, snapshot_entity_key);

File: .\supabase\migrations\012_activity_recording_backbone.sql
Line: 769
Text:
    comment on table public.current_snapshots is

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 10
Text:
    create unique index if not exists current_snapshots_user_entity_metric_uidx

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 11
Text:
    on public.current_snapshots (

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 96
Text:
    returns public.current_snapshots

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 101
Text:
    v_row public.current_snapshots;

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 103
Text:
    insert into public.current_snapshots (

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 135
Text:
    then public.current_snapshots.metric_value_numeric

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 137
Text:
    coalesce(public.current_snapshots.metric_value_numeric, 0)

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 141
Text:
    coalesce(excluded.metric_value_text, public.current_snapshots.metric_value_text),

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 143
Text:
    coalesce(excluded.metric_unit, public.current_snapshots.metric_unit),

File: .\supabase\migrations\016_activity_atomic_aggregate_updates.sql
Line: 146
Text:
    coalesce(public.current_snapshots.metadata_json, '{}'::jsonb)

File: .\supabase\migrations\017_activity_corrections.sql
Line: 17
Text:
    previous_current_snapshots_json jsonb not null default '[]'::jsonb,

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 16
Text:
    alter table public.current_snapshots enable row level security;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 29
Text:
    revoke all on table public.current_snapshots from anon, authenticated;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 59
Text:
    drop policy if exists "No direct public current snapshots access" on public.current_snapshots;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 61
Text:
    on public.current_snapshots

### First code references

- .\supabase\migrations\012_activity_recording_backbone.sql:210 - create table if not exists public.current_snapshots (
- .\supabase\migrations\012_activity_recording_backbone.sql:223 - constraint current_snapshots_user_entity_metric_unique
- .\supabase\migrations\012_activity_recording_backbone.sql:227 - drop trigger if exists trg_current_snapshots_updated_at on public.current_snapshots;
- .\supabase\migrations\012_activity_recording_backbone.sql:229 - create trigger trg_current_snapshots_updated_at
- .\supabase\migrations\012_activity_recording_backbone.sql:230 - before update on public.current_snapshots
- .\supabase\migrations\012_activity_recording_backbone.sql:292 - create index if not exists idx_current_snapshots_user_entity
- .\supabase\migrations\012_activity_recording_backbone.sql:293 - on public.current_snapshots(user_id, snapshot_entity_type, snapshot_entity_key);
- .\supabase\migrations\012_activity_recording_backbone.sql:769 - comment on table public.current_snapshots is
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:10 - create unique index if not exists current_snapshots_user_entity_metric_uidx
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:11 - on public.current_snapshots (
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:96 - returns public.current_snapshots
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:101 - v_row public.current_snapshots;
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:103 - insert into public.current_snapshots (
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:135 - then public.current_snapshots.metric_value_numeric
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:137 - coalesce(public.current_snapshots.metric_value_numeric, 0)
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:141 - coalesce(excluded.metric_value_text, public.current_snapshots.metric_value_text),
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:143 - coalesce(excluded.metric_unit, public.current_snapshots.metric_unit),
- .\supabase\migrations\016_activity_atomic_aggregate_updates.sql:146 - coalesce(public.current_snapshots.metadata_json, '{}'::jsonb)
- .\supabase\migrations\017_activity_corrections.sql:17 - previous_current_snapshots_json jsonb not null default '[]'::jsonb,
- .\supabase\migrations\019_activity_security_foundation.sql:16 - alter table public.current_snapshots enable row level security;
- .\supabase\migrations\019_activity_security_foundation.sql:29 - revoke all on table public.current_snapshots from anon, authenticated;
- .\supabase\migrations\019_activity_security_foundation.sql:59 - drop policy if exists "No direct public current snapshots access" on public.current_snapshots;
- .\supabase\migrations\019_activity_security_foundation.sql:61 - on public.current_snapshots
- .\src\app\activity-today\page.tsx:2561 - Current accumulated state from current_snapshots. This is global
- .\src\app\api\activity\day-summary\route.ts:555 - .from("current_snapshots")
- .\lib\activity\activityImpactProcessor.ts:295 - .from("current_snapshots")

---

## Table or term: activity_corrections

Referenced in files:
- .\supabase\migrations\017_activity_corrections.sql (18 matches)
- .\supabase\migrations\018_activity_corrections_status_rollback.sql (4 matches)
- .\supabase\migrations\019_activity_security_foundation.sql (4 matches)
- .\supabase\migrations\021_activity_processing_logs.sql (1 matches)
- .\src\app\activity-today\page.tsx (1 matches)
- .\src\app\api\activity\debug-trace\route.ts (3 matches)
- .\docs\activity-template-mapping-p4-4.md (2 matches)

### Migration / SQL / policy context


File: .\supabase\migrations\017_activity_corrections.sql
Line: 1
Text:
    create table if not exists public.activity_corrections (

File: .\supabase\migrations\017_activity_corrections.sql
Line: 27
Text:
    create index if not exists activity_corrections_user_id_created_at_idx

File: .\supabase\migrations\017_activity_corrections.sql
Line: 28
Text:
    on public.activity_corrections (user_id, created_at desc);

File: .\supabase\migrations\017_activity_corrections.sql
Line: 30
Text:
    create index if not exists activity_corrections_event_id_created_at_idx

File: .\supabase\migrations\017_activity_corrections.sql
Line: 31
Text:
    on public.activity_corrections (event_id, created_at desc);

File: .\supabase\migrations\017_activity_corrections.sql
Line: 33
Text:
    create index if not exists activity_corrections_status_idx

File: .\supabase\migrations\017_activity_corrections.sql
Line: 34
Text:
    on public.activity_corrections (correction_status);

File: .\supabase\migrations\017_activity_corrections.sql
Line: 38
Text:
    alter table public.activity_corrections

File: .\supabase\migrations\017_activity_corrections.sql
Line: 39
Text:
    add constraint activity_corrections_correction_type_check

File: .\supabase\migrations\017_activity_corrections.sql
Line: 57
Text:
    alter table public.activity_corrections

File: .\supabase\migrations\017_activity_corrections.sql
Line: 58
Text:
    add constraint activity_corrections_correction_status_check

File: .\supabase\migrations\017_activity_corrections.sql
Line: 73
Text:
    alter table public.activity_corrections

File: .\supabase\migrations\017_activity_corrections.sql
Line: 74
Text:
    add constraint activity_corrections_source_check

File: .\supabase\migrations\017_activity_corrections.sql
Line: 88
Text:
    comment on table public.activity_corrections is

File: .\supabase\migrations\017_activity_corrections.sql
Line: 91
Text:
    comment on column public.activity_corrections.previous_event_json is

File: .\supabase\migrations\017_activity_corrections.sql
Line: 94
Text:
    comment on column public.activity_corrections.previous_impact_events_json is

File: .\supabase\migrations\017_activity_corrections.sql
Line: 97
Text:
    comment on column public.activity_corrections.previous_daily_aggregates_json is

File: .\supabase\migrations\017_activity_corrections.sql
Line: 100
Text:
    comment on column public.activity_corrections.recalculation_result_json is

File: .\supabase\migrations\018_activity_corrections_status_rollback.sql
Line: 1
Text:
    alter table public.activity_corrections

File: .\supabase\migrations\018_activity_corrections_status_rollback.sql
Line: 2
Text:
    drop constraint if exists activity_corrections_correction_type_check;

File: .\supabase\migrations\018_activity_corrections_status_rollback.sql
Line: 4
Text:
    alter table public.activity_corrections

File: .\supabase\migrations\018_activity_corrections_status_rollback.sql
Line: 5
Text:
    add constraint activity_corrections_correction_type_check

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 21
Text:
    alter table public.activity_corrections enable row level security;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 31
Text:
    revoke all on table public.activity_corrections from anon, authenticated;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 75
Text:
    drop policy if exists "No direct public activity corrections access" on public.activity_corrections;

File: .\supabase\migrations\019_activity_security_foundation.sql
Line: 77
Text:
    on public.activity_corrections

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 17
Text:
    activity_correction_id uuid references public.activity_corrections(id) on delete set null,

### First code references

- .\supabase\migrations\017_activity_corrections.sql:1 - create table if not exists public.activity_corrections (
- .\supabase\migrations\017_activity_corrections.sql:27 - create index if not exists activity_corrections_user_id_created_at_idx
- .\supabase\migrations\017_activity_corrections.sql:28 - on public.activity_corrections (user_id, created_at desc);
- .\supabase\migrations\017_activity_corrections.sql:30 - create index if not exists activity_corrections_event_id_created_at_idx
- .\supabase\migrations\017_activity_corrections.sql:31 - on public.activity_corrections (event_id, created_at desc);
- .\supabase\migrations\017_activity_corrections.sql:33 - create index if not exists activity_corrections_status_idx
- .\supabase\migrations\017_activity_corrections.sql:34 - on public.activity_corrections (correction_status);
- .\supabase\migrations\017_activity_corrections.sql:38 - alter table public.activity_corrections
- .\supabase\migrations\017_activity_corrections.sql:39 - add constraint activity_corrections_correction_type_check
- .\supabase\migrations\017_activity_corrections.sql:57 - alter table public.activity_corrections
- .\supabase\migrations\017_activity_corrections.sql:58 - add constraint activity_corrections_correction_status_check
- .\supabase\migrations\017_activity_corrections.sql:73 - alter table public.activity_corrections
- .\supabase\migrations\017_activity_corrections.sql:74 - add constraint activity_corrections_source_check
- .\supabase\migrations\017_activity_corrections.sql:88 - comment on table public.activity_corrections is
- .\supabase\migrations\017_activity_corrections.sql:91 - comment on column public.activity_corrections.previous_event_json is
- .\supabase\migrations\017_activity_corrections.sql:94 - comment on column public.activity_corrections.previous_impact_events_json is
- .\supabase\migrations\017_activity_corrections.sql:97 - comment on column public.activity_corrections.previous_daily_aggregates_json is
- .\supabase\migrations\017_activity_corrections.sql:100 - comment on column public.activity_corrections.recalculation_result_json is
- .\supabase\migrations\018_activity_corrections_status_rollback.sql:1 - alter table public.activity_corrections
- .\supabase\migrations\018_activity_corrections_status_rollback.sql:2 - drop constraint if exists activity_corrections_correction_type_check;
- .\supabase\migrations\018_activity_corrections_status_rollback.sql:4 - alter table public.activity_corrections
- .\supabase\migrations\018_activity_corrections_status_rollback.sql:5 - add constraint activity_corrections_correction_type_check
- .\supabase\migrations\019_activity_security_foundation.sql:21 - alter table public.activity_corrections enable row level security;
- .\supabase\migrations\019_activity_security_foundation.sql:31 - revoke all on table public.activity_corrections from anon, authenticated;
- .\supabase\migrations\019_activity_security_foundation.sql:75 - drop policy if exists "No direct public activity corrections access" on public.activity_corrections;
- .\supabase\migrations\019_activity_security_foundation.sql:77 - on public.activity_corrections
- .\supabase\migrations\021_activity_processing_logs.sql:17 - activity_correction_id uuid references public.activity_corrections(id) on delete set null,
- .\src\app\activity-today\page.tsx:1348 - Read-only audit history from activity_corrections. It is loaded on
- .\src\app\api\activity\debug-trace\route.ts:426 - table: "activity_corrections",
- .\src\app\api\activity\debug-trace\route.ts:478 - table: "activity_corrections",
- .\src\app\api\activity\debug-trace\route.ts:1185 - sourceTable: "activity_corrections",
- .\docs\activity-template-mapping-p4-4.md:420 - - PATCH `/api/activity/intake/events/[id]` now creates an `activity_corrections` audit row when an `imported_pending` event is edited before confirm/reject.
- .\docs\activity-template-mapping-p4-4.md:507 - -> activity_corrections audit row for imported_pending edits

---

## Table or term: raw_activity_signals

Referenced in files:
- .\supabase\migrations\020_activity_raw_signals.sql (27 matches)
- .\supabase\migrations\021_activity_processing_logs.sql (1 matches)
- .\src\app\api\activity\debug-trace\route.ts (3 matches)
- .\src\app\api\activity\intake\route.ts (3 matches)
- .\src\app\api\activity\intake\signals\route.ts (1 matches)
- .\lib\activity\rawActivitySignals.ts (3 matches)
- .\docs\activity-intake-lifecycle-p4-2.md (1 matches)
- .\docs\activity-template-mapping-p4-4.md (1 matches)

### Migration / SQL / policy context


File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 10
Text:
    create table if not exists public.raw_activity_signals (

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 38
Text:
    constraint raw_activity_signals_source_type_check

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 57
Text:
    constraint raw_activity_signals_trust_level_check

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 69
Text:
    constraint raw_activity_signals_privacy_scope_check

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 79
Text:
    constraint raw_activity_signals_processing_status_check

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 93
Text:
    constraint raw_activity_signals_payload_is_object_check

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 96
Text:
    constraint raw_activity_signals_normalized_preview_is_object_check

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 99
Text:
    constraint raw_activity_signals_metadata_is_object_check

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 103
Text:
    drop trigger if exists trg_raw_activity_signals_updated_at on public.raw_activity_signals;

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 105
Text:
    create trigger trg_raw_activity_signals_updated_at

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 106
Text:
    before update on public.raw_activity_signals

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 110
Text:
    create index if not exists idx_raw_activity_signals_user_received_at

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 111
Text:
    on public.raw_activity_signals(user_id, received_at desc);

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 113
Text:
    create index if not exists idx_raw_activity_signals_user_processing_status

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 114
Text:
    on public.raw_activity_signals(user_id, processing_status, received_at desc);

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 116
Text:
    create index if not exists idx_raw_activity_signals_source_type_received_at

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 117
Text:
    on public.raw_activity_signals(source_type, received_at desc);

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 119
Text:
    create index if not exists idx_raw_activity_signals_output_event_id

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 120
Text:
    on public.raw_activity_signals(output_event_id);

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 122
Text:
    create unique index if not exists idx_raw_activity_signals_user_source_event_unique

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 123
Text:
    on public.raw_activity_signals(user_id, source_type, source_event_id)

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 126
Text:
    create unique index if not exists idx_raw_activity_signals_user_idempotency_key_unique

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 127
Text:
    on public.raw_activity_signals(user_id, source_type, idempotency_key)

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 130
Text:
    alter table public.raw_activity_signals enable row level security;

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 132
Text:
    revoke all on table public.raw_activity_signals from anon, authenticated;

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 134
Text:
    drop policy if exists "No direct public raw activity signals access" on public.raw_activity_signals;

File: .\supabase\migrations\020_activity_raw_signals.sql
Line: 137
Text:
    on public.raw_activity_signals

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 15
Text:
    raw_signal_id uuid references public.raw_activity_signals(id) on delete set null,

### First code references

- .\supabase\migrations\020_activity_raw_signals.sql:10 - create table if not exists public.raw_activity_signals (
- .\supabase\migrations\020_activity_raw_signals.sql:38 - constraint raw_activity_signals_source_type_check
- .\supabase\migrations\020_activity_raw_signals.sql:57 - constraint raw_activity_signals_trust_level_check
- .\supabase\migrations\020_activity_raw_signals.sql:69 - constraint raw_activity_signals_privacy_scope_check
- .\supabase\migrations\020_activity_raw_signals.sql:79 - constraint raw_activity_signals_processing_status_check
- .\supabase\migrations\020_activity_raw_signals.sql:93 - constraint raw_activity_signals_payload_is_object_check
- .\supabase\migrations\020_activity_raw_signals.sql:96 - constraint raw_activity_signals_normalized_preview_is_object_check
- .\supabase\migrations\020_activity_raw_signals.sql:99 - constraint raw_activity_signals_metadata_is_object_check
- .\supabase\migrations\020_activity_raw_signals.sql:103 - drop trigger if exists trg_raw_activity_signals_updated_at on public.raw_activity_signals;
- .\supabase\migrations\020_activity_raw_signals.sql:105 - create trigger trg_raw_activity_signals_updated_at
- .\supabase\migrations\020_activity_raw_signals.sql:106 - before update on public.raw_activity_signals
- .\supabase\migrations\020_activity_raw_signals.sql:110 - create index if not exists idx_raw_activity_signals_user_received_at
- .\supabase\migrations\020_activity_raw_signals.sql:111 - on public.raw_activity_signals(user_id, received_at desc);
- .\supabase\migrations\020_activity_raw_signals.sql:113 - create index if not exists idx_raw_activity_signals_user_processing_status
- .\supabase\migrations\020_activity_raw_signals.sql:114 - on public.raw_activity_signals(user_id, processing_status, received_at desc);
- .\supabase\migrations\020_activity_raw_signals.sql:116 - create index if not exists idx_raw_activity_signals_source_type_received_at
- .\supabase\migrations\020_activity_raw_signals.sql:117 - on public.raw_activity_signals(source_type, received_at desc);
- .\supabase\migrations\020_activity_raw_signals.sql:119 - create index if not exists idx_raw_activity_signals_output_event_id
- .\supabase\migrations\020_activity_raw_signals.sql:120 - on public.raw_activity_signals(output_event_id);
- .\supabase\migrations\020_activity_raw_signals.sql:122 - create unique index if not exists idx_raw_activity_signals_user_source_event_unique
- .\supabase\migrations\020_activity_raw_signals.sql:123 - on public.raw_activity_signals(user_id, source_type, source_event_id)
- .\supabase\migrations\020_activity_raw_signals.sql:126 - create unique index if not exists idx_raw_activity_signals_user_idempotency_key_unique
- .\supabase\migrations\020_activity_raw_signals.sql:127 - on public.raw_activity_signals(user_id, source_type, idempotency_key)
- .\supabase\migrations\020_activity_raw_signals.sql:130 - alter table public.raw_activity_signals enable row level security;
- .\supabase\migrations\020_activity_raw_signals.sql:132 - revoke all on table public.raw_activity_signals from anon, authenticated;
- .\supabase\migrations\020_activity_raw_signals.sql:134 - drop policy if exists "No direct public raw activity signals access" on public.raw_activity_signals;
- .\supabase\migrations\020_activity_raw_signals.sql:137 - on public.raw_activity_signals
- .\supabase\migrations\021_activity_processing_logs.sql:15 - raw_signal_id uuid references public.raw_activity_signals(id) on delete set null,
- .\src\app\api\activity\debug-trace\route.ts:413 - table: "raw_activity_signals",
- .\src\app\api\activity\debug-trace\route.ts:465 - table: "raw_activity_signals",
- .\src\app\api\activity\debug-trace\route.ts:1143 - sourceTable: "raw_activity_signals",
- .\src\app\api\activity\intake\route.ts:184 - .from("raw_activity_signals")
- .\src\app\api\activity\intake\route.ts:205 - .from("raw_activity_signals")
- .\src\app\api\activity\intake\route.ts:270 - "P4.2.7 stores raw_activity_signals only. Imported or external signals should be reviewed before becoming completed activities.",
- .\src\app\api\activity\intake\signals\route.ts:237 - .from("raw_activity_signals")
- .\lib\activity\rawActivitySignals.ts:144 - .from("raw_activity_signals")
- .\lib\activity\rawActivitySignals.ts:186 - .from("raw_activity_signals")
- .\lib\activity\rawActivitySignals.ts:219 - .from("raw_activity_signals")
- .\docs\activity-intake-lifecycle-p4-2.md:38 - - creates raw_activity_signals only
- .\docs\activity-template-mapping-p4-4.md:282 - Scope: imported_pending events created from raw_activity_signals.

---

## Table or term: activity_processing_logs

Referenced in files:
- .\supabase\migrations\021_activity_processing_logs.sql (32 matches)
- .\supabase\migrations\022_activity_processing_logs_complete_event_stage.sql (4 matches)
- .\src\app\api\activity\debug-trace\route.ts (5 matches)
- .\lib\activity\activityProcessingLogs.ts (1 matches)

### Migration / SQL / policy context


File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 10
Text:
    create table if not exists public.activity_processing_logs (

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 41
Text:
    constraint activity_processing_logs_processor_name_not_empty_check

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 44
Text:
    constraint activity_processing_logs_processing_stage_check

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 67
Text:
    constraint activity_processing_logs_processing_status_check

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 81
Text:
    constraint activity_processing_logs_severity_check

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 93
Text:
    constraint activity_processing_logs_duration_ms_check

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 99
Text:
    constraint activity_processing_logs_time_order_check

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 105
Text:
    constraint activity_processing_logs_input_is_object_check

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 108
Text:
    constraint activity_processing_logs_output_is_object_check

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 111
Text:
    constraint activity_processing_logs_error_is_object_check

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 114
Text:
    constraint activity_processing_logs_metadata_is_object_check

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 118
Text:
    drop trigger if exists trg_activity_processing_logs_updated_at on public.activity_processing_logs;

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 120
Text:
    create trigger trg_activity_processing_logs_updated_at

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 121
Text:
    before update on public.activity_processing_logs

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 125
Text:
    create index if not exists idx_activity_processing_logs_user_created_at

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 126
Text:
    on public.activity_processing_logs(user_id, created_at desc);

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 128
Text:
    create index if not exists idx_activity_processing_logs_raw_signal_id

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 129
Text:
    on public.activity_processing_logs(raw_signal_id, created_at desc);

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 131
Text:
    create index if not exists idx_activity_processing_logs_activity_event_id

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 132
Text:
    on public.activity_processing_logs(activity_event_id, created_at desc);

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 134
Text:
    create index if not exists idx_activity_processing_logs_activity_correction_id

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 135
Text:
    on public.activity_processing_logs(activity_correction_id, created_at desc);

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 137
Text:
    create index if not exists idx_activity_processing_logs_processing_run_id

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 138
Text:
    on public.activity_processing_logs(processing_run_id, created_at desc);

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 140
Text:
    create index if not exists idx_activity_processing_logs_stage_status

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 141
Text:
    on public.activity_processing_logs(processing_stage, processing_status, created_at desc);

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 143
Text:
    create index if not exists idx_activity_processing_logs_severity

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 144
Text:
    on public.activity_processing_logs(severity, created_at desc);

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 146
Text:
    alter table public.activity_processing_logs enable row level security;

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 148
Text:
    revoke all on table public.activity_processing_logs from anon, authenticated;

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 150
Text:
    drop policy if exists "No direct public activity processing logs access" on public.activity_processing_logs;

File: .\supabase\migrations\021_activity_processing_logs.sql
Line: 153
Text:
    on public.activity_processing_logs

File: .\supabase\migrations\022_activity_processing_logs_complete_event_stage.sql
Line: 7
Text:
    alter table public.activity_processing_logs

File: .\supabase\migrations\022_activity_processing_logs_complete_event_stage.sql
Line: 8
Text:
    drop constraint if exists activity_processing_logs_processing_stage_check;

File: .\supabase\migrations\022_activity_processing_logs_complete_event_stage.sql
Line: 10
Text:
    alter table public.activity_processing_logs

File: .\supabase\migrations\022_activity_processing_logs_complete_event_stage.sql
Line: 11
Text:
    add constraint activity_processing_logs_processing_stage_check

### First code references

- .\supabase\migrations\021_activity_processing_logs.sql:10 - create table if not exists public.activity_processing_logs (
- .\supabase\migrations\021_activity_processing_logs.sql:41 - constraint activity_processing_logs_processor_name_not_empty_check
- .\supabase\migrations\021_activity_processing_logs.sql:44 - constraint activity_processing_logs_processing_stage_check
- .\supabase\migrations\021_activity_processing_logs.sql:67 - constraint activity_processing_logs_processing_status_check
- .\supabase\migrations\021_activity_processing_logs.sql:81 - constraint activity_processing_logs_severity_check
- .\supabase\migrations\021_activity_processing_logs.sql:93 - constraint activity_processing_logs_duration_ms_check
- .\supabase\migrations\021_activity_processing_logs.sql:99 - constraint activity_processing_logs_time_order_check
- .\supabase\migrations\021_activity_processing_logs.sql:105 - constraint activity_processing_logs_input_is_object_check
- .\supabase\migrations\021_activity_processing_logs.sql:108 - constraint activity_processing_logs_output_is_object_check
- .\supabase\migrations\021_activity_processing_logs.sql:111 - constraint activity_processing_logs_error_is_object_check
- .\supabase\migrations\021_activity_processing_logs.sql:114 - constraint activity_processing_logs_metadata_is_object_check
- .\supabase\migrations\021_activity_processing_logs.sql:118 - drop trigger if exists trg_activity_processing_logs_updated_at on public.activity_processing_logs;
- .\supabase\migrations\021_activity_processing_logs.sql:120 - create trigger trg_activity_processing_logs_updated_at
- .\supabase\migrations\021_activity_processing_logs.sql:121 - before update on public.activity_processing_logs
- .\supabase\migrations\021_activity_processing_logs.sql:125 - create index if not exists idx_activity_processing_logs_user_created_at
- .\supabase\migrations\021_activity_processing_logs.sql:126 - on public.activity_processing_logs(user_id, created_at desc);
- .\supabase\migrations\021_activity_processing_logs.sql:128 - create index if not exists idx_activity_processing_logs_raw_signal_id
- .\supabase\migrations\021_activity_processing_logs.sql:129 - on public.activity_processing_logs(raw_signal_id, created_at desc);
- .\supabase\migrations\021_activity_processing_logs.sql:131 - create index if not exists idx_activity_processing_logs_activity_event_id
- .\supabase\migrations\021_activity_processing_logs.sql:132 - on public.activity_processing_logs(activity_event_id, created_at desc);
- .\supabase\migrations\021_activity_processing_logs.sql:134 - create index if not exists idx_activity_processing_logs_activity_correction_id
- .\supabase\migrations\021_activity_processing_logs.sql:135 - on public.activity_processing_logs(activity_correction_id, created_at desc);
- .\supabase\migrations\021_activity_processing_logs.sql:137 - create index if not exists idx_activity_processing_logs_processing_run_id
- .\supabase\migrations\021_activity_processing_logs.sql:138 - on public.activity_processing_logs(processing_run_id, created_at desc);
- .\supabase\migrations\021_activity_processing_logs.sql:140 - create index if not exists idx_activity_processing_logs_stage_status
- .\supabase\migrations\021_activity_processing_logs.sql:141 - on public.activity_processing_logs(processing_stage, processing_status, created_at desc);
- .\supabase\migrations\021_activity_processing_logs.sql:143 - create index if not exists idx_activity_processing_logs_severity
- .\supabase\migrations\021_activity_processing_logs.sql:144 - on public.activity_processing_logs(severity, created_at desc);
- .\supabase\migrations\021_activity_processing_logs.sql:146 - alter table public.activity_processing_logs enable row level security;
- .\supabase\migrations\021_activity_processing_logs.sql:148 - revoke all on table public.activity_processing_logs from anon, authenticated;
- .\supabase\migrations\021_activity_processing_logs.sql:150 - drop policy if exists "No direct public activity processing logs access" on public.activity_processing_logs;
- .\supabase\migrations\021_activity_processing_logs.sql:153 - on public.activity_processing_logs
- .\supabase\migrations\022_activity_processing_logs_complete_event_stage.sql:7 - alter table public.activity_processing_logs
- .\supabase\migrations\022_activity_processing_logs_complete_event_stage.sql:8 - drop constraint if exists activity_processing_logs_processing_stage_check;
- .\supabase\migrations\022_activity_processing_logs_complete_event_stage.sql:10 - alter table public.activity_processing_logs
- .\supabase\migrations\022_activity_processing_logs_complete_event_stage.sql:11 - add constraint activity_processing_logs_processing_stage_check
- .\src\app\api\activity\debug-trace\route.ts:439 - table: "activity_processing_logs",
- .\src\app\api\activity\debug-trace\route.ts:491 - table: "activity_processing_logs",
- .\src\app\api\activity\debug-trace\route.ts:517 - table: "activity_processing_logs",
- .\src\app\api\activity\debug-trace\route.ts:530 - table: "activity_processing_logs",

Code references truncated. Total matches: 42

---

## P4.7.1 Preliminary conclusion template

| Area | Existing? | Key files | Ownership fields | RLS/policies found? | Risk | Decision |
|---|---:|---|---|---|---|---|
| value_objects | TBD | TBD | TBD | TBD | TBD | canonical / compatibility TBD |
| offers | TBD | TBD | TBD | TBD | do not break commercial core | additive value_object bridge only |
| certificates | TBD | TBD | TBD | TBD | do not break QR/redeem/points lifecycle | additive links only |
| purchase_confirmations | TBD | TBD | TBD | TBD | do not break public masked history | additive trust/value links only |
| points ledger | TBD | TBD | TBD | TBD | never manually edit balances | ledger links only |
| activity foundation | TBD | TBD | TBD | TBD | do not break imported_pending/confirm/corrections | source of truth remains activity_events |
| VOI/state bridge | TBD | TBD | TBD | TBD | missing or partial | design in P4.7.3 |
