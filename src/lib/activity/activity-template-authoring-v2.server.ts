import { supabase } from "../../../lib/supabase";

import type { ActivityTemplateAuthoringV2Input } from "@/lib/activity-template-impact-profile-contract";

type AssignmentRow = {
  id: string;
  value_object_id: string;
  parameter_definition_id: string;
};

type SaveInput = {
  ownerUserId: string;
  ownerActorId: string;
  templateId: string | null;
  body: ActivityTemplateAuthoringV2Input;
};

function parameterRows(body: ActivityTemplateAuthoringV2Input) {
  return body.parameterDefinitionIds.map((parameterDefinitionId, index) => ({
    parameterDefinitionId,
    capturePolicyCode: "deterministic_or_ai",
    isRequired: false,
    displayOrder: (index + 1) * 10,
  }));
}

async function readMatchingAssignments(
  body: ActivityTemplateAuthoringV2Input,
): Promise<AssignmentRow[]> {
  if (
    body.parameterDefinitionIds.length === 0 ||
    body.targetValueObjectIds.length === 0
  ) {
    return [];
  }

  const { data, error } = await supabase
    .from("value_object_parameter_assignments")
    .select("id,value_object_id,parameter_definition_id")
    .eq("status", "active")
    .in("value_object_id", body.targetValueObjectIds)
    .in("parameter_definition_id", body.parameterDefinitionIds);

  if (error) {
    throw new Error(`ACTIVITY_TEMPLATE_ASSIGNMENT_READ_FAILED:${error.message}`);
  }

  return (data ?? []) as AssignmentRow[];
}

async function linkRows(body: ActivityTemplateAuthoringV2Input) {
  const assignments = await readMatchingAssignments(body);
  const assignmentByTargetAndDefinition = new Map(
    assignments.map((assignment) => [
      `${assignment.value_object_id}|${assignment.parameter_definition_id}`,
      assignment,
    ]),
  );

  return body.targetValueObjectIds.map((targetValueObjectId) => {
    const routes = body.parameterDefinitionIds.flatMap(
      (sourceParameterDefinitionId) => {
        const assignment = assignmentByTargetAndDefinition.get(
          `${targetValueObjectId}|${sourceParameterDefinitionId}`,
        );

        if (!assignment) {
          return [];
        }

        return [
          {
            sourceParameterDefinitionId,
            targetParameterAssignmentId: assignment.id,
            routeKindCode: "direct_measure",
            derivationContract: {},
          },
        ];
      },
    );

    return {
      targetValueObjectId,
      relationCode: "affects",
      confidence: 1,
      notes: "",
      routes,
    };
  });
}

export async function saveActivityTemplateAuthoringV2(input: SaveInput) {
  const parameters = parameterRows(input.body);
  const links = await linkRows(input.body);

  const { data, error } = await supabase.rpc(
    "save_activity_template_impact_profile_v2",
    {
      p_owner_user_id: input.ownerUserId,
      p_owner_actor_id: input.ownerActorId,
      p_template_id: input.templateId,
      p_title: input.body.title,
      p_description: input.body.description || null,
      p_template_group: "general",
      p_default_duration_minutes: input.body.defaultDurationMinutes,
      p_notes: input.body.notes || null,
      p_parameters: parameters,
      p_links: links,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
