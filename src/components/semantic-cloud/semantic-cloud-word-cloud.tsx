import type { SemanticCloudWord as SemanticCloudWordType } from "../../types/semantic-cloud";

import { SemanticCloudWord } from "./semantic-cloud-word";

export type SemanticCloudWordCloudProps = {
  readonly items: readonly SemanticCloudWordType[];
};

export function SemanticCloudWordCloud({ items }: SemanticCloudWordCloudProps) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-3xl border border-dashed border-[rgba(124,128,153,0.35)] bg-[#f0f2f7] p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-[#1a1d2e]">
            Пока нет публичных категорий для отображения
          </p>
          <p className="mt-2 max-w-md text-xs leading-5 text-[#7c8099]">
            Облако показывает только подтверждённые public-safe связи категорий
            с публичными объектами.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[260px] overflow-hidden rounded-3xl border border-[rgba(59,110,248,0.14)] bg-gradient-to-br from-white via-[#eef2ff] to-white p-5 shadow-inner">
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#3b6ef8]/10 blur-3xl" />
      <div className="absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-[#8b5cf6]/10 blur-3xl" />

      <div className="relative flex min-h-[220px] flex-wrap content-center items-center justify-center gap-3">
        {items.map((word) => (
          <SemanticCloudWord key={word.id} word={word} />
        ))}
      </div>
    </div>
  );
}
