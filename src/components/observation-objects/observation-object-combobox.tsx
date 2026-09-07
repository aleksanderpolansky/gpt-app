"use client";

import { useId, useMemo, useState } from "react";

export type ObservationObjectComboboxOption = {
  id: string;
  title: string;
  description?: string | null;
  titleEn?: string | null;
  descriptionEn?: string | null;
  canonicalKey?: string | null;
  meta?: string | null;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: ObservationObjectComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  ariaLabel: string;
  disabled?: boolean;
};

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function searchScore(option: ObservationObjectComboboxOption, normalizedQuery: string) {
  if (!normalizedQuery) return 10;

  const title = normalizeSearchText(option.title);
  const titleEn = normalizeSearchText(option.titleEn);
  const description = normalizeSearchText(option.description);
  const descriptionEn = normalizeSearchText(option.descriptionEn);
  const canonicalKey = normalizeSearchText(option.canonicalKey);
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const haystack = [title, titleEn, description, descriptionEn, canonicalKey]
    .filter(Boolean)
    .join(" ");

  if (!tokens.every((token) => haystack.includes(token))) return Number.POSITIVE_INFINITY;
  if (title.startsWith(normalizedQuery)) return 0;
  if (title.includes(normalizedQuery)) return 1;
  if (titleEn.startsWith(normalizedQuery)) return 2;
  if (titleEn.includes(normalizedQuery)) return 3;
  if (description.includes(normalizedQuery)) return 4;
  if (descriptionEn.includes(normalizedQuery)) return 5;
  if (canonicalKey.includes(normalizedQuery)) return 6;
  return 7;
}

export function ObservationObjectCombobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  ariaLabel,
  disabled = false,
}: Props) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find((option) => option.id === value) ?? null;
  const normalizedQuery = normalizeSearchText(query);

  const filtered = useMemo(() => {
    return options
      .map((option) => ({ option, score: searchScore(option, normalizedQuery) }))
      .filter((item) => Number.isFinite(item.score))
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.option.title.localeCompare(b.option.title, undefined, { sensitivity: "base" });
      })
      .map((item) => item.option);
  }, [normalizedQuery, options]);

  const visible = filtered.slice(0, 80);
  const currentIndex = visible.length ? Math.min(activeIndex, visible.length - 1) : -1;
  const inputValue = open ? query : selected?.title ?? "";

  function choose(option: ObservationObjectComboboxOption) {
    onChange(option.id);
    setQuery(option.title);
    setActiveIndex(0);
    setOpen(false);
  }

  return (
    <div className="relative mt-1">
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        disabled={disabled}
        value={inputValue}
        placeholder={open ? searchPlaceholder : placeholder}
        onFocus={() => {
          setQuery("");
          setActiveIndex(0);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
          if (value) onChange("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (!visible.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, visible.length - 1));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.max(index - 1, 0));
            return;
          }
          if (event.key === "Enter" && open && currentIndex >= 0) {
            event.preventDefault();
            choose(visible[currentIndex]);
          }
        }}
        className="h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
      />

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-[#d8def0] bg-white p-1 shadow-lg"
        >
          {visible.length ? (
            <>
              {visible.map((option, index) => {
                const active = index === currentIndex;
                const englishDiffers =
                  option.titleEn &&
                  normalizeSearchText(option.titleEn) !== normalizeSearchText(option.title);
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={option.id === value}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(option);
                    }}
                    className={`block w-full rounded-lg px-3 py-2 text-left ${active ? "bg-[#eef3ff]" : "hover:bg-[#f7f9ff]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-bold text-[#263044]">{option.title}</span>
                      {option.meta ? <span className="shrink-0 text-[10px] font-bold text-[#65708d]">{option.meta}</span> : null}
                    </div>
                    {englishDiffers ? <div className="mt-0.5 text-[11px] text-[#65708d]">EN: {option.titleEn}</div> : null}
                    {option.description ? <div className="mt-1 max-h-10 overflow-hidden text-xs leading-5 text-[#727991]">{option.description}</div> : null}
                  </button>
                );
              })}
              {filtered.length > visible.length ? (
                <div className="px-3 py-2 text-right text-[10px] text-[#9ca3af]">{visible.length} / {filtered.length}</div>
              ) : null}
            </>
          ) : (
            <div className="px-3 py-3 text-sm text-[#727991]">{emptyLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
