begin;

insert into object_classes (
  code,
  name,
  description,
  status,
  source_type,
  sort_order,
  is_active
)
select
  seed.code,
  seed.name,
  seed.description,
  'approved',
  'system_seed',
  seed.sort_order,
  true
from (
  values
    ('business_entity', 'Business entity', 'Organizations, companies, entrepreneurs, communities and other actors in the business directory.', 10),
    ('commercial_object', 'Commercial object', 'Products, services, offers, certificates and other sellable or exchangeable objects.', 20),
    ('transaction', 'Transaction', 'Purchases, confirmations, points movements, payments and commercial events.', 30),
    ('activity', 'Activity', 'Personal, professional, physical, learning and productivity activities.', 40),
    ('health', 'Health', 'Health metrics, nutrition, physical load, recovery and wellbeing records.', 50),
    ('learning', 'Learning', 'Learning sessions, language practice, exams, certificates and knowledge items.', 60),
    ('finance', 'Finance', 'Financial records, analysis, budgets, costs, revenue and investment-related events.', 70),
    ('project', 'Project', 'Projects, tasks, milestones, plans, workflows and implementation steps.', 80),
    ('content', 'Content', 'Notes, documents, messages, posts, prompts and knowledge fragments.', 90)
) as seed(code, name, description, sort_order)
where not exists (
  select 1
  from object_classes existing
  where lower(existing.code) = lower(seed.code)
);

insert into object_types (
  object_class_id,
  code,
  name,
  description,
  status,
  source_type,
  sort_order,
  is_active
)
select
  object_classes.id,
  seed.code,
  seed.name,
  seed.description,
  'approved',
  'system_seed',
  seed.sort_order,
  true
from (
  values
    ('business_entity', 'organization', 'Organization', 'A company, entrepreneur, partner, provider, community or other organization.', 10),
    ('business_entity', 'person', 'Person', 'A person participating in the platform as buyer, seller, owner, consultant or other role.', 20),
    ('commercial_object', 'value_object', 'Value object', 'A product, service, certificate base, unit of value or commercial object.', 30),
    ('commercial_object', 'offer', 'Offer', 'A commercial offer, promotion, certificate offer, reward or marketplace item.', 40),
    ('commercial_object', 'offer_item', 'Offer item', 'An item included in an offer.', 50),
    ('commercial_object', 'certificate', 'Certificate', 'A certificate, voucher, reward or redeemable right connected to an offer.', 60),
    ('transaction', 'purchase_confirmation', 'Purchase confirmation', 'A buyer request and seller decision confirming a purchase.', 70),
    ('transaction', 'points_transaction', 'Points transaction', 'A points movement: award, reserve, charge, release, spend or correction.', 80),
    ('activity', 'activity', 'Activity', 'A tracked action or event performed by the user.', 90),
    ('activity', 'task', 'Task', 'A planned or executed task inside a project, workflow or personal system.', 100),
    ('health', 'health_metric', 'Health metric', 'A measurable health or wellbeing indicator.', 110),
    ('health', 'food_entry', 'Food entry', 'A nutrition record: meal, drink, supplement or ingredient.', 120),
    ('health', 'exercise', 'Exercise', 'A physical exercise, workout element or training load record.', 130),
    ('learning', 'learning_item', 'Learning item', 'A learning unit, sentence, word, lesson, exam item or knowledge block.', 140),
    ('learning', 'learning_session', 'Learning session', 'A session of language learning, professional study or certification preparation.', 150),
    ('finance', 'finance_event', 'Finance event', 'A financial record, cost, income, budget item, investment or analytical event.', 160),
    ('project', 'project', 'Project', 'A project, initiative, product module or implementation direction.', 170),
    ('content', 'note', 'Note', 'A note, idea, prompt, document fragment or captured thought.', 180)
) as seed(class_code, code, name, description, sort_order)
join object_classes
  on lower(object_classes.code) = lower(seed.class_code)
where not exists (
  select 1
  from object_types existing
  where lower(existing.code) = lower(seed.code)
);

insert into action_types (
  code,
  name,
  description,
  status,
  source_type,
  sort_order,
  is_active
)
select
  seed.code,
  seed.name,
  seed.description,
  'approved',
  'system_seed',
  seed.sort_order,
  true
from (
  values
    ('create', 'Create', 'Create a new object or record.', 10),
    ('edit', 'Edit', 'Update or correct an existing object or record.', 20),
    ('publish', 'Publish', 'Make an object visible in a public or semi-public layer.', 30),
    ('hide', 'Hide', 'Hide an object from public or active use.', 40),
    ('search', 'Search', 'Search, filter, browse or discover objects.', 50),
    ('classify', 'Classify', 'Assign object type, context or category to an entity.', 60),
    ('recommend', 'Recommend', 'Generate a recommendation or next best action.', 70),
    ('analyze', 'Analyze', 'Analyze data, behavior, finance, health, learning or business state.', 80),
    ('buy', 'Buy', 'Buy or request a product, service, certificate or offer.', 90),
    ('sell', 'Sell', 'Sell or provide a product, service, certificate or offer.', 100),
    ('confirm', 'Confirm', 'Confirm a request, purchase, action or status.', 110),
    ('reject', 'Reject', 'Reject a request, purchase, action or status.', 120),
    ('redeem', 'Redeem', 'Redeem a certificate, reward or right.', 130),
    ('award_points', 'Award points', 'Award loyalty points after a qualifying event.', 140),
    ('reserve_points', 'Reserve points', 'Reserve points before final confirmation or redemption.', 150),
    ('spend_points', 'Spend points', 'Spend or charge points.', 160),
    ('release_points', 'Release points', 'Release previously reserved points.', 170),
    ('track', 'Track', 'Track an activity, metric, event or user state.', 180),
    ('measure', 'Measure', 'Measure a physical, health, business or performance indicator.', 190),
    ('eat', 'Eat', 'Record or analyze eating, drinking or nutrition intake.', 200),
    ('exercise', 'Exercise', 'Record or analyze physical exercise.', 210),
    ('learn', 'Learn', 'Study, practice, repeat or test knowledge.', 220),
    ('plan', 'Plan', 'Plan tasks, projects, schedule or next actions.', 230),
    ('manage', 'Manage', 'Manage objects, roles, statuses, settings or workflows.', 240)
) as seed(code, name, description, sort_order)
where not exists (
  select 1
  from action_types existing
  where lower(existing.code) = lower(seed.code)
);

insert into contexts (
  code,
  name,
  description,
  status,
  source_type,
  sort_order,
  is_active
)
select
  seed.code,
  seed.name,
  seed.description,
  'approved',
  'system_seed',
  seed.sort_order,
  true
from (
  values
    ('business_directory', 'Business directory', 'Public and private catalog of organizations by geography and activity direction.', 10),
    ('marketplace', 'Marketplace', 'Products, services, offers, certificates and commercial interactions.', 20),
    ('offer', 'Offer', 'Offer creation, configuration, publication and analysis.', 30),
    ('certificate', 'Certificate', 'Certificate purchase, delivery, redemption, cancellation and public history.', 40),
    ('purchase', 'Purchase', 'Purchase confirmation, seller approval and points awarding.', 50),
    ('loyalty', 'Loyalty', 'Points, rewards, retention mechanics and loyalty logic.', 60),
    ('personal_activity', 'Personal activity', 'Personal activity tracking and next-action recommendation.', 70),
    ('health', 'Health', 'Nutrition, body load, recovery, exercise and health consulting.', 80),
    ('learning', 'Learning', 'Language learning, professional courses, exams and certification progress.', 90),
    ('finance', 'Finance', 'Financial consulting, cost analysis, revenue, budget and investment logic.', 100),
    ('project', 'Project', 'Project planning, implementation, milestones and development workflow.', 110),
    ('productivity', 'Productivity', 'Attention, energy, focus, efficiency and balance between life directions.', 120),
    ('family', 'Family', 'Family-related activities, scheduling, support and responsibilities.', 130)
) as seed(code, name, description, sort_order)
where not exists (
  select 1
  from contexts existing
  where lower(existing.code) = lower(seed.code)
);

insert into contextual_categories (
  context_id,
  parent_id,
  slug,
  name,
  description,
  status,
  source_type,
  sort_order,
  is_active
)
select
  contexts.id,
  null,
  seed.slug,
  seed.name,
  seed.description,
  'approved',
  'system_seed',
  seed.sort_order,
  true
from (
  values
    ('business_directory', 'food-and-drinks', 'Food and drinks', 'Cafes, restaurants, bars, food delivery and groceries.', 10),
    ('business_directory', 'beauty', 'Beauty', 'Beauty salons, hairdressers, cosmetology and personal care.', 20),
    ('business_directory', 'health-and-wellness', 'Health and wellness', 'Massage, prevention, recovery, wellness and health-supporting services.', 30),
    ('business_directory', 'sport-and-fitness', 'Sport and fitness', 'Fitness, training, studios and sport-related services.', 40),
    ('business_directory', 'education', 'Education', 'Courses, tutors, schools, adult and children education.', 50),
    ('business_directory', 'b2b-services', 'B2B services', 'Services for entrepreneurs, companies and professional teams.', 60),
    ('business_directory', 'home-services', 'Home services', 'Repair, cleaning, domestic help and home service providers.', 70),
    ('business_directory', 'auto', 'Auto', 'Car dealers, repair shops, washing, parts and auto services.', 80),
    ('business_directory', 'events-and-entertainment', 'Events and entertainment', 'Events, entertainment, leisure and culture.', 90),
    ('business_directory', 'retail', 'Retail', 'Shops, goods and local retail trade.', 100),
    ('business_directory', 'professional-services', 'Professional services', 'Consulting, legal, accounting and business services.', 110),
    ('business_directory', 'other', 'Other', 'Other organizations, services and activities.', 999),

    ('health', 'nutrition', 'Nutrition', 'Food, drinks, supplements, macro- and micronutrients.', 10),
    ('health', 'physical-load', 'Physical load', 'Exercises, muscle load, movement, fatigue and recovery.', 20),
    ('health', 'sleep-and-recovery', 'Sleep and recovery', 'Sleep, rest, regeneration and readiness.', 30),
    ('health', 'body-metrics', 'Body metrics', 'Weight, heart rate, oxygen, subjective state and other measurements.', 40),

    ('learning', 'languages', 'Languages', 'English, German, Spanish, Polish and other language learning.', 10),
    ('learning', 'professional-skills', 'Professional skills', 'Sales, marketing, management, IT, process maturity and certifications.', 20),
    ('learning', 'exam-preparation', 'Exam preparation', 'Intermediate exams, certificates and structured testing.', 30),

    ('finance', 'personal-budget', 'Personal budget', 'Personal income, expenses, savings and spending limits.', 10),
    ('finance', 'business-finance', 'Business finance', 'Revenue, margin, commissions, partner economics and pricing.', 20),
    ('finance', 'ai-costs', 'AI costs', 'Token usage, API costs, model selection and cost transparency.', 30),

    ('project', 'implementation', 'Implementation', 'Coding, migrations, UI, integrations and technical execution.', 10),
    ('project', 'strategy', 'Strategy', 'Roadmaps, product decisions, business model and long-term planning.', 20),
    ('project', 'risk-and-compliance', 'Risk and compliance', 'Legal, security, privacy and operational risk.', 30),

    ('productivity', 'focus', 'Focus', 'Attention, concentration, distractions and deep work.', 10),
    ('productivity', 'energy-management', 'Energy management', 'Energy balance, fatigue, recovery and activity switching.', 20),
    ('productivity', 'time-management', 'Time management', 'Planning, scheduling and realistic distribution of time.', 30),

    ('loyalty', 'points', 'Points', 'Points earning, reservation, spending, release and balance history.', 10),
    ('loyalty', 'certificates-and-rewards', 'Certificates and rewards', 'Certificates, rewards, vouchers and redemption logic.', 20),
    ('loyalty', 'retention', 'Retention', 'Repeat visits, return purchases and loyalty incentives.', 30)
) as seed(context_code, slug, name, description, sort_order)
join contexts
  on lower(contexts.code) = lower(seed.context_code)
where not exists (
  select 1
  from contextual_categories existing
  where existing.context_id = contexts.id
    and lower(existing.slug) = lower(seed.slug)
);

insert into object_action_affordances (
  object_type_id,
  action_type_id,
  context_id,
  is_default,
  status,
  source_type,
  notes
)
select
  object_types.id,
  action_types.id,
  contexts.id,
  seed.is_default,
  'approved',
  'system_seed',
  seed.notes
from (
  values
    ('organization', 'create', 'business_directory', true, 'Organizations can be created by owners.'),
    ('organization', 'publish', 'business_directory', true, 'Organizations can be published into the directory.'),
    ('organization', 'search', 'business_directory', true, 'Organizations can be searched and filtered in the directory.'),
    ('organization', 'classify', 'business_directory', true, 'Organizations can be classified by business directory category.'),
    ('organization', 'manage', 'business_directory', true, 'Owners and admins can manage organization directory data.'),

    ('value_object', 'create', 'marketplace', true, 'Value objects can be created as products, services or certificate bases.'),
    ('value_object', 'classify', 'marketplace', true, 'Value objects can be classified for marketplace and analytics.'),
    ('value_object', 'manage', 'marketplace', true, 'Value objects can be managed by the owner.'),

    ('offer', 'create', 'offer', true, 'Offers can be created from value objects.'),
    ('offer', 'publish', 'offer', true, 'Offers can be published when ready.'),
    ('offer', 'buy', 'marketplace', true, 'Offers can be bought or requested by users.'),
    ('offer', 'analyze', 'finance', false, 'Offers can be analyzed for revenue, margin, points and conversion.'),
    ('offer', 'classify', 'offer', true, 'Offers can be classified by object, action and context.'),

    ('certificate', 'buy', 'certificate', true, 'Certificates can be purchased or requested.'),
    ('certificate', 'confirm', 'certificate', true, 'Certificates can require seller confirmation.'),
    ('certificate', 'redeem', 'certificate', true, 'Certificates can be redeemed by QR or redeem code.'),
    ('certificate', 'analyze', 'loyalty', false, 'Certificates can be analyzed for loyalty, retention and breakage.'),

    ('purchase_confirmation', 'create', 'purchase', true, 'Buyer can register a purchase confirmation request.'),
    ('purchase_confirmation', 'confirm', 'purchase', true, 'Seller can confirm a purchase.'),
    ('purchase_confirmation', 'reject', 'purchase', true, 'Seller can reject a purchase request.'),
    ('purchase_confirmation', 'award_points', 'loyalty', true, 'Confirmed purchases can award points.'),

    ('points_transaction', 'award_points', 'loyalty', true, 'Points can be awarded after a qualifying event.'),
    ('points_transaction', 'reserve_points', 'loyalty', true, 'Points can be reserved before final decision.'),
    ('points_transaction', 'spend_points', 'loyalty', true, 'Points can be spent on certificates or rewards.'),
    ('points_transaction', 'release_points', 'loyalty', true, 'Reserved points can be released.'),

    ('activity', 'track', 'personal_activity', true, 'Personal activities can be tracked.'),
    ('activity', 'analyze', 'productivity', true, 'Activities can be analyzed for impact and balance.'),
    ('activity', 'recommend', 'productivity', true, 'The system can recommend next best actions.'),

    ('food_entry', 'eat', 'health', true, 'Food entries record nutrition intake.'),
    ('food_entry', 'analyze', 'health', true, 'Food entries can be analyzed for nutrition and body impact.'),

    ('exercise', 'exercise', 'health', true, 'Exercises record physical load.'),
    ('exercise', 'analyze', 'health', true, 'Exercises can be analyzed for muscle load and recovery.'),

    ('health_metric', 'measure', 'health', true, 'Health metrics can be measured and tracked.'),
    ('health_metric', 'analyze', 'health', true, 'Health metrics can be analyzed over time.'),

    ('learning_item', 'learn', 'learning', true, 'Learning items can be studied and repeated.'),
    ('learning_session', 'track', 'learning', true, 'Learning sessions can be tracked.'),
    ('learning_session', 'analyze', 'learning', true, 'Learning progress can be analyzed.'),

    ('finance_event', 'track', 'finance', true, 'Finance events can be recorded.'),
    ('finance_event', 'analyze', 'finance', true, 'Finance events can be analyzed.'),

    ('project', 'plan', 'project', true, 'Projects can be planned and structured.'),
    ('task', 'manage', 'project', true, 'Tasks can be managed inside projects.'),
    ('note', 'classify', 'content', true, 'Notes can be classified and routed to contexts.')
) as seed(object_type_code, action_type_code, context_code, is_default, notes)
join object_types
  on lower(object_types.code) = lower(seed.object_type_code)
join action_types
  on lower(action_types.code) = lower(seed.action_type_code)
join contexts
  on lower(contexts.code) = lower(seed.context_code)
where not exists (
  select 1
  from object_action_affordances existing
  where existing.object_type_id = object_types.id
    and existing.action_type_id = action_types.id
    and coalesce(existing.context_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(contexts.id, '00000000-0000-0000-0000-000000000000'::uuid)
);

insert into context_translations (
  context_id,
  locale,
  name,
  description
)
select
  contexts.id,
  seed.locale,
  seed.name,
  seed.description
from (
  values
    ('business_directory', 'ru', 'Каталог предприятий', 'Публичный и приватный каталог организаций по географии и направлениям деятельности.'),
    ('marketplace', 'ru', 'Маркетплейс', 'Товары, услуги, предложения, сертификаты и коммерческие взаимодействия.'),
    ('offer', 'ru', 'Предложения', 'Создание, настройка, публикация и анализ предложений.'),
    ('certificate', 'ru', 'Сертификаты', 'Покупка, доставка, погашение, отмена и публичная история сертификатов.'),
    ('purchase', 'ru', 'Покупки', 'Подтверждение покупок, решения продавца и начисление points.'),
    ('loyalty', 'ru', 'Лояльность', 'Points, награды, удержание клиентов и логика повторных покупок.'),
    ('personal_activity', 'ru', 'Личная активность', 'Мониторинг личной активности и рекомендации следующего действия.'),
    ('health', 'ru', 'Здоровье', 'Питание, физическая нагрузка, восстановление, упражнения и health consulting.'),
    ('learning', 'ru', 'Обучение', 'Языки, профессиональные курсы, экзамены и сертификации.'),
    ('finance', 'ru', 'Финансы', 'Финансовая аналитика, расходы, доходы, бюджет и инвестиционная логика.'),
    ('project', 'ru', 'Проекты', 'Планирование, внедрение, этапы и разработка проекта.'),
    ('productivity', 'ru', 'Продуктивность', 'Внимание, энергия, фокус, эффективность и баланс направлений.'),
    ('family', 'ru', 'Семья', 'Семейные активности, расписание, поддержка и обязанности.')
) as seed(context_code, locale, name, description)
join contexts
  on lower(contexts.code) = lower(seed.context_code)
where not exists (
  select 1
  from context_translations existing
  where existing.context_id = contexts.id
    and lower(existing.locale) = lower(seed.locale)
);

insert into contextual_category_translations (
  contextual_category_id,
  locale,
  name,
  description
)
select
  contextual_categories.id,
  seed.locale,
  seed.name,
  seed.description
from (
  values
    ('business_directory', 'food-and-drinks', 'ru', 'Еда и напитки', 'Кафе, рестораны, бары, доставка еды и продукты.'),
    ('business_directory', 'beauty', 'ru', 'Красота', 'Салоны красоты, парикмахерские, косметология и уход.'),
    ('business_directory', 'health-and-wellness', 'ru', 'Здоровье и wellness', 'Массаж, профилактика, восстановление и wellness-услуги.'),
    ('business_directory', 'sport-and-fitness', 'ru', 'Спорт и фитнес', 'Фитнес, тренировки, студии и спортивные услуги.'),
    ('business_directory', 'education', 'ru', 'Образование', 'Курсы, репетиторы, школы, обучение взрослых и детей.'),
    ('business_directory', 'b2b-services', 'ru', 'B2B-услуги', 'Услуги для предпринимателей, компаний и профессиональных команд.'),
    ('business_directory', 'home-services', 'ru', 'Домашние услуги', 'Ремонт, уборка, бытовые услуги и сервис на дому.'),
    ('business_directory', 'auto', 'ru', 'Авто', 'Автосалоны, сервис, мойки, запчасти и автоуслуги.'),
    ('business_directory', 'events-and-entertainment', 'ru', 'События и развлечения', 'Мероприятия, развлечения, досуг и культура.'),
    ('business_directory', 'retail', 'ru', 'Розница', 'Магазины, товары и локальная розничная торговля.'),
    ('business_directory', 'professional-services', 'ru', 'Профессиональные услуги', 'Консалтинг, юридические, бухгалтерские и деловые услуги.'),
    ('business_directory', 'other', 'ru', 'Другое', 'Прочие организации, услуги и виды деятельности.')
) as seed(context_code, category_slug, locale, name, description)
join contexts
  on lower(contexts.code) = lower(seed.context_code)
join contextual_categories
  on contextual_categories.context_id = contexts.id
 and lower(contextual_categories.slug) = lower(seed.category_slug)
where not exists (
  select 1
  from contextual_category_translations existing
  where existing.contextual_category_id = contextual_categories.id
    and lower(existing.locale) = lower(seed.locale)
);

commit;