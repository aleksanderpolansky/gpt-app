import { createArctorTableRowDeleteRequest } from "@/components/tables/arctor-row-delete-contract";

export type ValueObjectTableDeleteBlocker = {
  table?: string | null;
  column?: string | null;
  count?: number | null;
};

type ValueObjectTableDeleteApiResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  deletedId?: string;
  deletedTitle?: string;
  parentValueObjectId?: string | null;
  blocker?: ValueObjectTableDeleteBlocker | null;
};

export type ValueObjectTableDeleteResult = {
  deletedId: string;
  deletedTitle: string | null;
  parentValueObjectId: string | null;
};

export class ValueObjectTableDeleteError extends Error {
  readonly errorCode: string | null;
  readonly blocker: ValueObjectTableDeleteBlocker | null;

  constructor(input: {
    message: string;
    errorCode?: string | null;
    blocker?: ValueObjectTableDeleteBlocker | null;
  }) {
    super(input.message);
    this.name = "ValueObjectTableDeleteError";
    this.errorCode = input.errorCode ?? null;
    this.blocker = input.blocker ?? null;
  }
}

export async function deleteObservationObjectFromTable(input: {
  rowId: string;
}): Promise<ValueObjectTableDeleteResult> {
  const request = createArctorTableRowDeleteRequest({
    source: "toolbar",
    rowKey: input.rowId,
    historyPolicy: "domain_managed",
    namespace: "vo-table-delete",
  });

  const response = await fetch(
    `/api/value-objects/${encodeURIComponent(request.rowKey)}`,
    {
      method: "DELETE",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    },
  );

  const payload = (await response
    .json()
    .catch(() => null)) as ValueObjectTableDeleteApiResponse | null;

  if (!response.ok || payload?.ok !== true) {
    throw new ValueObjectTableDeleteError({
      message:
        payload?.error ||
        `ROW_DELETE_HTTP_${response.status}`,
      errorCode: payload?.errorCode ?? null,
      blocker: payload?.blocker ?? null,
    });
  }

  const deletedId = payload.deletedId?.trim();
  if (!deletedId || deletedId !== request.rowKey) {
    throw new ValueObjectTableDeleteError({
      message: "ROW_DELETE_RESPONSE_ID_MISMATCH",
      errorCode: "ROW_DELETE_RESPONSE_ID_MISMATCH",
    });
  }

  return {
    deletedId,
    deletedTitle: payload.deletedTitle?.trim() || null,
    parentValueObjectId: payload.parentValueObjectId?.trim() || null,
  };
}
