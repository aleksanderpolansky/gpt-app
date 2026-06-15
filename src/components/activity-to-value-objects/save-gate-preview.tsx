import Link from "next/link";

import {
  saveGateContractPreviewRequest,
  saveGateContractPreviewResponse,
} from "@/data/activity-to-value-objects/save-gate-contract-preview";
import type {
  ActivityFactsSaveGateRequest,
  ActivityFactsSaveGateResponse,
} from "@/types/activity-facts-save-gate";

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function TableShell({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
      </table>
    </div>
  );
}

function RequestSummary({ request }: { request: ActivityFactsSaveGateRequest }) {
  const packageText = request.activityProcessingPackage.rawInput.text;
  const acceptedCount = request.factDecisions.filter((item) => item.decision === "accept").length;
  const deferredCount = request.factDecisions.filter((item) => item.decision === "defer").length;
  const rejectedCount = request.factDecisions.filter((item) => item.decision === "reject").length;
  const editedCount = request.editedFactDecisions.length;

  return (
    <Section
      title="1. Save Gate Request Summary"
      description="Это будущий request body для server-mediated save gate. В Step 08 он только отображается и не отправляется в API."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Исходная активность
          </div>
          <div className="mt-2 text-base font-medium text-slate-950">{packageText}</div>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill>routeMode: {request.routeMode}</StatusPill>
            <StatusPill>sourcePackageId: {request.sourcePackageId}</StatusPill>
            <StatusPill>idempotencyKey: {request.idempotencyKey}</StatusPill>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-2xl font-bold text-slate-950">{acceptedCount}</div>
            <div className="text-xs text-slate-500">accepted</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-2xl font-bold text-slate-950">{deferredCount}</div>
            <div className="text-xs text-slate-500">deferred</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-2xl font-bold text-slate-950">{rejectedCount}</div>
            <div className="text-xs text-slate-500">rejected</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-2xl font-bold text-slate-950">{editedCount}</div>
            <div className="text-xs text-slate-500">edited</div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function FactDecisionsTable({ request }: { request: ActivityFactsSaveGateRequest }) {
  return (
    <Section
      title="2. User Fact Decisions"
      description="Эти решения показывают, какие fact previews пользователь готов принять, отложить, отклонить или отредактировать."
    >
      <TableShell headers={["fact localId", "decision", "reason"]}>
        {request.factDecisions.map((decision) => (
          <tr key={decision.factLocalId}>
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
              {decision.factLocalId}
            </td>
            <td className="px-4 py-3">
              <StatusPill>{decision.decision}</StatusPill>
            </td>
            <td className="min-w-96 px-4 py-3 text-slate-600">{decision.reasonRu}</td>
          </tr>
        ))}
      </TableShell>
    </Section>
  );
}

function ValueObjectDecisionTable({ request }: { request: ActivityFactsSaveGateRequest }) {
  return (
    <Section
      title="3. Missing Value Object Decisions"
      description="Недостающие Value Objects не создаются автоматически. Здесь видно, какие решения ещё ожидаются от пользователя."
    >
      <TableShell
        headers={[
          "semantic key",
          "proposed title",
          "decision",
          "selected existing VO",
          "proposed parent",
          "reason",
        ]}
      >
        {request.valueObjectCandidateDecisions.map((decision) => (
          <tr key={decision.semanticObjectKey}>
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
              {decision.semanticObjectKey}
            </td>
            <td className="px-4 py-3 font-semibold text-slate-950">{decision.proposedTitleRu}</td>
            <td className="px-4 py-3">
              <StatusPill>{decision.decision}</StatusPill>
            </td>
            <td className="px-4 py-3 text-slate-800">
              <div className="font-semibold text-slate-950">
                {decision.selectedExistingValueObjectTitle ?? "—"}
              </div>
              <div className="font-mono text-xs text-slate-500">
                {decision.selectedExistingValueObjectId ?? "—"}
              </div>
            </td>
            <td className="px-4 py-3 text-slate-800">
              <div className="font-semibold text-slate-950">
                {decision.proposedParentTitleRu ?? "—"}
              </div>
              <div className="font-mono text-xs text-slate-500">
                {decision.proposedParentValueObjectId ?? "—"}
              </div>
            </td>
            <td className="min-w-96 px-4 py-3 text-slate-600">{decision.reasonRu}</td>
          </tr>
        ))}
      </TableShell>
    </Section>
  );
}

function PlannedWritesTable({ response }: { response: ActivityFactsSaveGateResponse }) {
  return (
    <Section
      title="4. Planned Writes by Table"
      description="Это не реальные записи. Таблица показывает, что будущий save gate должен будет записать после отдельного write gate."
    >
      <TableShell headers={["target table", "operation", "local source", "planned DB id", "write status", "description"]}>
        {response.plannedWrites.map((write) => (
          <tr key={`${write.targetTable}-${write.localSourceId}`}>
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
              {write.targetTable}
            </td>
            <td className="px-4 py-3">
              <StatusPill>{write.operation}</StatusPill>
            </td>
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
              {write.localSourceId}
            </td>
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
              {write.plannedDbId ?? "—"}
            </td>
            <td className="px-4 py-3">
              <StatusPill>{write.writeStatus}</StatusPill>
            </td>
            <td className="min-w-96 px-4 py-3 text-slate-600">{write.descriptionRu}</td>
          </tr>
        ))}
      </TableShell>
    </Section>
  );
}

function SkippedRows({ response }: { response: ActivityFactsSaveGateResponse }) {
  return (
    <Section
      title="5. Skipped / Deferred Rows"
      description="Эти строки не должны быть записаны до подтверждения пользователя или уточнения контекста."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            factLocalIds
          </div>
          <ul className="mt-3 space-y-2">
            {response.skipped.factLocalIds.map((id) => (
              <li key={id} className="font-mono text-xs text-slate-700">
                {id}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            semanticObjectKeys
          </div>
          <ul className="mt-3 space-y-2">
            {response.skipped.semanticObjectKeys.map((key) => (
              <li key={key} className="font-mono text-xs text-slate-700">
                {key}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            reasons
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {response.skipped.reasonsRu.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

function ResponseSummary({ response }: { response: ActivityFactsSaveGateResponse }) {
  const rows = [
    ["endpoint", response.endpoint],
    ["routeMode", response.routeMode],
    ["writeStatus", response.writeStatus],
    ["dbWriteExecuted", String(response.dbWriteExecuted)],
    ["sqlExecuted", String(response.sqlExecuted)],
    ["openAiCallExecuted", String(response.openAiCallExecuted)],
    ["activityEventId", response.createdIds.activityEventId ?? "—"],
    ["measureIds", String(response.createdIds.measureIds.length)],
    ["valueObjectIds", String(response.createdIds.valueObjectIds.length)],
    ["factIds", String(response.createdIds.factIds.length)],
    ["reviewItemIds", String(response.createdIds.reviewItemIds.length)],
    ["recalculationQueueIds", String(response.createdIds.recalculationQueueIds.length)],
  ];

  return (
    <Section
      title="6. Contract Preview Response"
      description="Такой response shape должен вернуть будущий stable endpoint. Сейчас это fixture без выполнения route."
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-4">
            <div className="font-mono text-xs text-slate-500">{label}</div>
            <div className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SafetyBlock({ response }: { response: ActivityFactsSaveGateResponse }) {
  const rows = [
    ["serverMediatedOnly", String(response.safety.serverMediatedOnly)],
    ["directBrowserSupabaseWriteAllowed", String(response.safety.directBrowserSupabaseWriteAllowed)],
    ["duplicateChronologicalTimeAllowed", String(response.safety.duplicateChronologicalTimeAllowed)],
    ["medicalDiagnosisAllowed", String(response.safety.medicalDiagnosisAllowed)],
  ];

  return (
    <Section
      title="7. Safety / No-write Boundary"
      description="Step 08 обязан доказать, что это только визуализация контракта, а не скрытая запись."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rounded-xl border border-slate-200">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
              <span className="font-mono text-xs text-slate-600">{label}</span>
              <span className="font-semibold text-slate-950">{value}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {response.safety.notes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

export function SaveGatePreview({
  request = saveGateContractPreviewRequest,
  response = saveGateContractPreviewResponse,
}: {
  request?: ActivityFactsSaveGateRequest;
  response?: ActivityFactsSaveGateResponse;
}) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            ACTIVITY_TO_VALUE_OBJECTS_CONTROLLED_FLOW · Step 08 / 12
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Save Gate Preview
          </h1>
          <p className="mt-3 max-w-5xl text-sm leading-6 text-slate-600">
            Read-only страница показывает будущий контракт server-mediated save gate:
            какие решения пользователя войдут в request, какие записи будут запланированы,
            какие строки будут отложены и почему запись пока не выполняется.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/activity-capture/controlled-flow-map"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Controlled Flow Map
            </Link>
            <Link
              href="/activity-capture/facts-preview"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Activity Facts Preview
            </Link>
            <Link
              href="/value-objects/tree-preview"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Value Objects Tree Preview
            </Link>
            <Link
              href="/workspace"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Workspace
            </Link>
          </div>
        </header>

        <RequestSummary request={request} />
        <FactDecisionsTable request={request} />
        <ValueObjectDecisionTable request={request} />
        <PlannedWritesTable response={response} />
        <SkippedRows response={response} />
        <ResponseSummary response={response} />
        <SafetyBlock response={response} />
      </div>
    </main>
  );
}
