import { supabase } from "../../../lib/supabase";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CuratorIdentity = {
  curatorAppUserId: string;
  curatorAdminId: string;
  curatorRole: string;
};

type MaterializeResult = {
  contract?: string;
  parameterDefinitionId?: string;
  valueObjectIds?: string[];
  assignmentIds?: string[];
  rowsWritten?: number;
  idempotentReplay?: boolean;
};

function uniqueUuids(values: string[]) {
  return [...new Set(values.map((value) => value.trim()))].filter((value) =>
    UUID_RE.test(value),
  );
}

export async function materializeSystemParameterAssignmentsV1(input: {
  parameterDefinitionId: string;
  valueObjectIds: string[];
  curator: CuratorIdentity;
  idempotencyKey: string;
}) {
  const parameterDefinitionId = input.parameterDefinitionId.trim();
  const valueObjectIds = uniqueUuids(input.valueObjectIds);
  const idempotencyKey = input.idempotencyKey.trim();

  if (!UUID_RE.test(parameterDefinitionId)) {
    throw new Error(
      "CURATOR_SYSTEM_PARAMETER_ASSIGNMENT_PARAMETER_ID_INVALID",
    );
  }

  if (valueObjectIds.length === 0) {
    throw new Error(
      "CURATOR_SYSTEM_PARAMETER_ASSIGNMENT_VALUE_OBJECTS_REQUIRED",
    );
  }

  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    throw new Error(
      "CURATOR_SYSTEM_PARAMETER_ASSIGNMENT_IDEMPOTENCY_INVALID",
    );
  }

  const { data, error } = await supabase.rpc(
    "save_system_value_object_parameter_assignment_set_v1",
    {
      p_parameter_definition_id: parameterDefinitionId,
      p_value_object_ids: valueObjectIds,
      p_curator_app_user_id: input.curator.curatorAppUserId,
      p_curator_admin_id: input.curator.curatorAdminId,
      p_curator_role: input.curator.curatorRole,
      p_idempotency_key: idempotencyKey,
    },
  );

  if (error) {
    const missingRpc =
      error.code === "42883" ||
      /save_system_value_object_parameter_assignment_set_v1/i.test(
        error.message,
      );

    if (missingRpc) {
      throw new Error(
        "CURATOR_SYSTEM_PARAMETER_ASSIGNMENT_MIGRATION_REQUIRED",
      );
    }

    throw new Error(
      `CURATOR_SYSTEM_PARAMETER_ASSIGNMENT_SAVE_FAILED:${error.message}`,
    );
  }

  return (data ?? {}) as MaterializeResult;
}
