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