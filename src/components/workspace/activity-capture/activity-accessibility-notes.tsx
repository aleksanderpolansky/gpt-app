export const ACTIVITY_CAPTURE_A11Y_ADDED =
  "ACTIVITY_CAPTURE_A11Y_ADDED" as const;

export interface ActivityAccessibilityNotesProps {
  inputRegionId: string;
  previewRegionId: string;
  safetyRegionId: string;
}

const accessibilityChecklist = [
  "Main section has aria-labelledby and aria-describedby",
  "Input and controls are grouped in a labelled region",
  "Preview output uses aria-live polite",
  "Safety boundary has a stable described region",
  "Buttons remain keyboard reachable",
];

export function ActivityAccessibilityNotes({
  inputRegionId,
  previewRegionId,
  safetyRegionId,
}: ActivityAccessibilityNotesProps) {
  return (
    <aside
      id="activity-capture-a11y-summary"
      aria-labelledby="activity-capture-a11y-title"
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Accessibility labels
          </p>

          <h3
            id="activity-capture-a11y-title"
            className="mt-2 text-sm font-semibold text-slate-900"
          >
            A11y summary
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Этот блок добавляет понятные labels для screen reader и keyboard
            navigation. Он не меняет данные и не создаёт Activity Event.
          </p>
        </div>

        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          local UI only
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-xs leading-5 text-slate-600">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="font-semibold text-slate-900">Input region</dt>
          <dd>{inputRegionId}</dd>
        </div>

        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="font-semibold text-slate-900">Preview region</dt>
          <dd>{previewRegionId}</dd>
        </div>

        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="font-semibold text-slate-900">Safety region</dt>
          <dd>{safetyRegionId}</dd>
        </div>
      </dl>

      <ul className="mt-4 grid gap-2">
        {accessibilityChecklist.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-xs leading-5 text-slate-600"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
        Accessibility notes are descriptive UI helpers only. They do not save,
        submit, sync or persist anything.
      </p>
    </aside>
  );
}
