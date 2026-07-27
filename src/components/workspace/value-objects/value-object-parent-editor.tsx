import Link from "next/link";

type ValueObjectParentEditorProps = {
  readonly valueObjectId: string;
};

export function ValueObjectParentEditor({
  valueObjectId,
}: ValueObjectParentEditorProps) {
  return (
    <section className="rounded-2xl border border-[#e6dcff] bg-[#faf8ff] p-5 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5cf6]">
          P8 · controlled hierarchy
        </p>
        <h2 className="text-lg font-semibold text-slate-950">
          Родитель и структура дерева
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          Родитель больше не изменяется обычным PATCH черновика. Перенос объекта,
          перенос поддерева и вставка промежуточного узла выполняются через
          предпросмотр и одну атомарную транзакцию с журналом операции.
        </p>
      </div>

      <Link
        href={`/value-objects/${encodeURIComponent(valueObjectId)}/restructure`}
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#8b5cf6] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7c3aed]"
      >
        Перестроить дерево безопасно
      </Link>
    </section>
  );
}
