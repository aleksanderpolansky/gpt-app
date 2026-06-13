import Link from "next/link";

type ValueObjectEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const PRIVATE_FIELDS = [
  "Название",
  "Описание",
  "Категории",
  "Родительский ценный объект",
  "Критерии прогресса",
  "Приватность",
];

const COMMERCIAL_FIELDS = [
  "Предприятие",
  "Товар / услуга / консультация",
  "Цена",
  "Валюта",
  "Длительность",
  "Offer / certificate usage",
];

export default async function ValueObjectEditPage({
  params,
}: ValueObjectEditPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-full bg-[#f5f6fb] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1120px] gap-5">
        <header className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c8099]">
            Draft-first Value Object / Edit skeleton
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
                Редактирование ценного объекта
              </h1>

              <p className="mt-2 max-w-[780px] text-[14px] leading-6 text-[#5a5f7a]">
                Это безопасный skeleton маршрута{" "}
                <span className="font-mono text-[#1a1d2e]">
                  /value-objects/{"{id}"}/edit
                </span>
                . Он нужен для draft-first flow: сначала создаётся минимальный
                черновик с ID, затем пользователь заполняет поля на этой странице.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/value-objects"
                className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
              >
                Все Value Objects
              </Link>

              <Link
                href="/value-objects/new"
                className="rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-3 text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
              >
                Создать новый
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-[18px] border border-[#dfe6ff] bg-[#f7f9ff] p-5 shadow-[0_8px_24px_rgba(59,110,248,0.07)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
            Current draft identity
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#e3e8ff] bg-white p-4">
              <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                value_object_id
              </div>
              <div className="mt-1 break-all font-mono text-[13px] font-semibold text-[#1a1d2e]">
                {id}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e3e8ff] bg-white p-4">
              <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                target API contract
              </div>
              <div className="mt-1 font-mono text-[13px] font-semibold text-[#1a1d2e]">
                usage_scope = private | commercial
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-[#c9d5ff] bg-white p-4">
            <div className="text-[13px] font-bold text-[#1a1d2e]">
              No-write skeleton
            </div>
            <p className="mt-2 text-[13px] leading-5 text-[#5a5f7a]">
              Эта страница пока не сохраняет изменения и не делает DB write.
              Следующий шаг подключит загрузку черновика и форму редактирования
              по характеристике объекта: частный или коммерческий.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7c8099]">
              usage_scope = private
            </div>

            <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#111827]">
              Частный ценный объект
            </h2>

            <p className="mt-2 text-[14px] leading-6 text-[#5a5f7a]">
              Для личных целей, навыков, здоровья, обучения, проектов и
              аналитики пользователя. В этом режиме{" "}
              <span className="font-mono">organization_id = null</span>.
            </p>

            <ul className="mt-4 grid gap-2">
              {PRIVATE_FIELDS.map((field) => (
                <li
                  key={field}
                  className="rounded-xl border border-[#edf0f7] bg-[#f8fafc] px-4 py-3 text-[13px] font-semibold text-[#343854]"
                >
                  {field}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7c8099]">
              usage_scope = commercial
            </div>

            <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#111827]">
              Коммерческий ценный объект
            </h2>

            <p className="mt-2 text-[14px] leading-6 text-[#5a5f7a]">
              Для товара, услуги, консультации, доступа, материала, offer или
              certificate-сценария предприятия. В этом режиме{" "}
              <span className="font-mono">organization_id</span> обязателен.
            </p>

            <ul className="mt-4 grid gap-2">
              {COMMERCIAL_FIELDS.map((field) => (
                <li
                  key={field}
                  className="rounded-xl border border-[#edf0f7] bg-[#f8fafc] px-4 py-3 text-[13px] font-semibold text-[#343854]"
                >
                  {field}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-[18px] border border-[#bbf7d0] bg-[#f0fdf4] p-5 shadow-[0_8px_24px_rgba(22,163,74,0.08)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#047857]">
                Characteristics / Measures / Relations / Rollup
              </div>

              <h2 className="mt-2 text-[22px] font-bold tracking-[-0.02em] text-[#064e3b]">
                No-write architecture preview
              </h2>

              <p className="mt-2 max-w-[820px] text-[14px] leading-6 text-[#166534]">
                Этот блок только объясняет будущую модель редактирования. Он не
                сохраняет данные, не вызывает API, не выполняет SQL и не делает
                OpenAI-запрос. Цель — не смешивать свойства объекта, факты
                события, связи влияния и rollup-аналитику.
              </p>
            </div>

            <Link
              href="/value-objects/characteristics-rollup-preview"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#86efac] bg-white px-4 py-3 text-[13px] font-bold text-[#047857] shadow-sm transition hover:bg-[#dcfce7]"
            >
              Open full model preview
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#bbf7d0] bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#047857]">
                Object characteristics
              </div>
              <div className="mt-2 font-mono text-[13px] font-semibold text-[#064e3b]">
                value_object_characteristics
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#166534]">
                Object characteristics are not event facts. Например:
                movement_pattern, equipment, material, standard service format.
              </p>
            </div>

            <div className="rounded-2xl border border-[#bfdbfe] bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2563eb]">
                Event measures
              </div>
              <div className="mt-2 font-mono text-[13px] font-semibold text-[#1e3a8a]">
                activity_event_measures
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#1d4ed8]">
                event measures live on the Activity Event: duration, repetitions,
                body_weight_at_event, load, tempo, distance.
              </p>
            </div>

            <div className="rounded-2xl border border-[#ddd6fe] bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7c3aed]">
                Relations / impact
              </div>
              <div className="mt-2 font-mono text-[13px] font-semibold text-[#4c1d95]">
                value_object_relations
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#6d28d9]">
                Relations and impact stay graph-like: affects, part_of,
                supports, stabilizes, improves, with confidence and source.
              </p>
            </div>

            <div className="rounded-2xl border border-[#fed7aa] bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c2410c]">
                Analytics rollup
              </div>
              <div className="mt-2 font-mono text-[13px] font-semibold text-[#7c2d12]">
                analytics_rollups
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#9a3412]">
                Rollup preview does not duplicate time. Activity time is stored
                once and lifted through exposure links and impact rules.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-[#86efac] bg-white p-4 text-[13px] leading-5 text-[#166534]">
            <span className="font-bold text-[#064e3b]">Calf raise example:</span>{" "}
            “подъём на носки 2 минуты, 45 повторений, вес 95 кг” means:
            exercise properties stay on the Value Object; duration/repetitions/body
            weight are event measures; muscle influence is a relation/impact rule;
            calf/leg/body analytics are rollup estimates.
          </div>
        </section>
        <section className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7c8099]">
            Next implementation contract
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-[#f5f6fb] p-4">
              <div className="font-mono text-[13px] font-semibold text-[#1a1d2e]">
                GET draft
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#5a5f7a]">
                Загрузить Value Object по ID и проверить владельца.
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f6fb] p-4">
              <div className="font-mono text-[13px] font-semibold text-[#1a1d2e]">
                PATCH draft
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#5a5f7a]">
                Сохранить поля черновика без публикации.
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f6fb] p-4">
              <div className="font-mono text-[13px] font-semibold text-[#1a1d2e]">
                activate
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#5a5f7a]">
                Перевести объект из draft в active после проверки.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
