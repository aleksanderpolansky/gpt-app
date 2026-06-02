import type { ReviewSafetyNote } from "./activity-review-types";

export const SAFETY_NOTES_SECTION_CREATED =
  "SAFETY_NOTES_SECTION_CREATED" as const;

type SafetyNoteTone = "neutral" | "success" | "warning" | "danger" | "muted";

interface SafetyNotesSectionProps {
  safetyNotes: ReviewSafetyNote[];
  title?: string;
  description?: string;
  maxVisibleNotes?: number;
  className?: string;
}

interface SafetyNoteCardProps {
  note: SafetyNoteViewModel;
}

interface SafetyNoteViewModel {
  id: string;
  label: string;
  description: string;
  tone: SafetyNoteTone;
  ariaLabel: string;
}

interface SafetyNotesSummary {
  totalCount: number;
  noHiddenWritesCount: number;
  candidatePackageCount: number;
  parserExplanationCount: number;
  hasSafetyNotes: boolean;
  hasNoHiddenWritesNote: boolean;
  summaryText: string;
}

const SAFETY_NOTE_TONE_CLASS_NAMES: Record<SafetyNoteTone, string> = {
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
  muted:
    "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400",
};

function getSafetyNoteToneClassName(tone: SafetyNoteTone): string {
  return SAFETY_NOTE_TONE_CLASS_NAMES[tone];
}

function getSafetyNoteTone(note: ReviewSafetyNote): SafetyNoteTone {
  const label = note.label.toLowerCase();
  const description = note.description.toLowerCase();

  if (
    label.includes("no hidden writes") ||
    description.includes("ничего не сохраняет") ||
    description.includes("does not perform db write")
  ) {
    return "success";
  }

  if (
    label.includes("candidate") ||
    description.includes("candidate") ||
    description.includes("кандидат")
  ) {
    return "warning";
  }

  if (
    label.includes("parser") ||
    description.includes("parser") ||
    description.includes("объяснение")
  ) {
    return "neutral";
  }

  return "muted";
}

function mapSafetyNoteToViewModel(note: ReviewSafetyNote): SafetyNoteViewModel {
  return {
    id: note.id,
    label: note.label,
    description: note.description,
    tone: getSafetyNoteTone(note),
    ariaLabel: `${note.label}. ${note.description}`,
  };
}

function sortSafetyNotes(safetyNotes: ReviewSafetyNote[]): ReviewSafetyNote[] {
  return [...safetyNotes].sort((firstNote, secondNote) => {
    const firstIsNoHiddenWrites = firstNote.label
      .toLowerCase()
      .includes("no hidden writes");
    const secondIsNoHiddenWrites = secondNote.label
      .toLowerCase()
      .includes("no hidden writes");

    if (firstIsNoHiddenWrites !== secondIsNoHiddenWrites) {
      return firstIsNoHiddenWrites ? -1 : 1;
    }

    return firstNote.label.localeCompare(secondNote.label);
  });
}

function mapSafetyNotesToViewModels(
  safetyNotes: ReviewSafetyNote[],
): SafetyNoteViewModel[] {
  return sortSafetyNotes(safetyNotes).map(mapSafetyNoteToViewModel);
}

function summarizeSafetyNotes(
  safetyNotes: ReviewSafetyNote[],
): SafetyNotesSummary {
  const noHiddenWritesCount = safetyNotes.filter((note) =>
    note.label.toLowerCase().includes("no hidden writes"),
  ).length;

  const candidatePackageCount = safetyNotes.filter((note) => {
    const label = note.label.toLowerCase();
    const description = note.description.toLowerCase();

    return label.includes("candidate") || description.includes("candidate");
  }).length;

  const parserExplanationCount = safetyNotes.filter((note) => {
    const label = note.label.toLowerCase();
    const description = note.description.toLowerCase();

    return label.includes("parser") || description.includes("parser");
  }).length;

  const hasSafetyNotes = safetyNotes.length > 0;
  const hasNoHiddenWritesNote = noHiddenWritesCount > 0;

  const summaryText = hasSafetyNotes
    ? `Safety notes: ${safetyNotes.length}. No hidden writes: ${noHiddenWritesCount}. Candidate package: ${candidatePackageCount}. Parser explanations: ${parserExplanationCount}.`
    : "Safety notes are not available yet.";

  return {
    totalCount: safetyNotes.length,
    noHiddenWritesCount,
    candidatePackageCount,
    parserExplanationCount,
    hasSafetyNotes,
    hasNoHiddenWritesNote,
    summaryText,
  };
}

function getVisibleSafetyNotes(
  notes: SafetyNoteViewModel[],
  maxVisibleNotes: number | undefined,
): SafetyNoteViewModel[] {
  if (maxVisibleNotes === undefined) {
    return notes;
  }

  if (maxVisibleNotes <= 0) {
    return [];
  }

  return notes.slice(0, maxVisibleNotes);
}

function countHiddenSafetyNotes(
  notes: SafetyNoteViewModel[],
  maxVisibleNotes: number | undefined,
): number {
  if (maxVisibleNotes === undefined) {
    return 0;
  }

  if (maxVisibleNotes <= 0) {
    return notes.length;
  }

  return Math.max(0, notes.length - maxVisibleNotes);
}

function buildSafetyNotesAriaSummary(
  notes: SafetyNoteViewModel[],
  hiddenCount: number,
): string {
  const visibleCount = notes.length;

  if (visibleCount === 0 && hiddenCount === 0) {
    return "Safety notes are not available for this local review package.";
  }

  if (hiddenCount > 0) {
    return `Safety notes visible: ${visibleCount}. Hidden notes: ${hiddenCount}.`;
  }

  return `Safety notes visible: ${visibleCount}.`;
}

function SafetyNoteCard({ note }: SafetyNoteCardProps) {
  return (
    <li
      className={[
        "rounded-2xl border px-4 py-3",
        getSafetyNoteToneClassName(note.tone),
      ].join(" ")}
      aria-label={note.ariaLabel}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
        {note.label}
      </p>
      <p className="mt-2 text-sm leading-6">{note.description}</p>
    </li>
  );
}

export function SafetyNotesSection({
  safetyNotes,
  title = "Safety notes",
  description = "Эта секция фиксирует ограничения local-only review package: без скрытых сохранений, без Activity Event, без создания Value Objects.",
  maxVisibleNotes,
  className,
}: SafetyNotesSectionProps) {
  const mappedNotes = mapSafetyNotesToViewModels(safetyNotes);
  const visibleNotes = getVisibleSafetyNotes(mappedNotes, maxVisibleNotes);
  const hiddenCount = countHiddenSafetyNotes(mappedNotes, maxVisibleNotes);
  const summary = summarizeSafetyNotes(safetyNotes);
  const ariaSummary = buildSafetyNotesAriaSummary(visibleNotes, hiddenCount);

  return (
    <section
      className={[
        "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-950",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="safety-notes-section-title"
      aria-describedby="safety-notes-section-summary"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Local safety gate
          </p>
          <h2
            id="safety-notes-section-title"
            className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {summary.totalCount} notes
        </span>
      </div>

      <p
        id="safety-notes-section-summary"
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
      >
        {summary.summaryText}
      </p>

      {!summary.hasNoHiddenWritesNote ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <strong className="font-semibold">Attention:</strong>{" "}
          no explicit “No hidden writes” safety note was found in this package.
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <strong className="font-semibold">Safety confirmed:</strong>{" "}
          this review package includes a No hidden writes note.
        </div>
      )}

      <div className="mt-4" aria-label={ariaSummary}>
        {visibleNotes.length > 0 ? (
          <ul className="grid gap-3">
            {visibleNotes.map((note) => (
              <SafetyNoteCard key={note.id} note={note} />
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Safety notes are not available yet.
          </div>
        )}
      </div>

      {hiddenCount > 0 ? (
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          +{hiddenCount} hidden safety notes in this local-only review preview.
        </p>
      ) : null}

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          Candidate note:
        </strong>{" "}
        safety notes are explanatory UI warnings only. This component does not
        save data, does not create Value Objects, does not create Activity Event
        and does not perform DB write.
      </div>
    </section>
  );
}
