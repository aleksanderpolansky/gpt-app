import { getSupabaseAdminClient } from '../../supabase/admin';

export type ControlledActivityIntakeOwnershipContextResolutionSelectedScope =
  | 'personal_space'
  | 'organization_creator'
  | 'none';

export type ControlledActivityIntakeOwnershipContextResolutionReadOnlyStatus =
  | 'not_executed'
  | 'missing_mapped_app_user'
  | 'missing_requested_context'
  | 'requested_context_invalid'
  | 'owned_space_resolved'
  | 'owned_space_not_found'
  | 'owned_space_not_owned_by_mapped_user'
  | 'owned_space_inactive'
  | 'actor_space_role_resolved'
  | 'actor_space_role_not_found'
  | 'actor_space_role_inactive'
  | 'actor_not_found'
  | 'actor_inactive'
  | 'creator_organization_resolved'
  | 'organization_not_found'
  | 'organization_not_created_by_mapped_user'
  | 'organization_inactive'
  | 'organization_actor_resolved'
  | 'organization_actor_not_found'
  | 'organization_actor_mismatch'
  | 'context_ambiguous'
  | 'context_lookup_error';

export type ControlledActivityIntakeOwnershipContextResolutionReadOnlyInput = {
  mappedAppUserId: string | null | undefined;
  requestedActorId?: string | null | undefined;
  requestedSpaceId?: string | null | undefined;
  requestedOrganizationId?: string | null | undefined;
  requestedContextSource?: string | null | undefined;
};

export type ControlledActivityIntakeOwnershipContextResolutionReadOnlyResult = {
  executed: boolean;
  status: ControlledActivityIntakeOwnershipContextResolutionReadOnlyStatus;
  resolved: boolean;
  dbReadExecuted: boolean;
  failClosed: boolean;
  selectedContextScope: ControlledActivityIntakeOwnershipContextResolutionSelectedScope;
  requestedContextAcceptedAsHintOnly: true;
  mappedAppUserRequired: true;
  ownedSpaceResolved: boolean;
  actorSpaceRoleResolved: boolean;
  creatorOrganizationResolved: boolean;
  organizationActorResolved: boolean;
  responseSanitized: true;
  appUserId: string | null;
  actorId: string | null;
  spaceId: string | null;
  organizationId: string | null;
  actorSpaceRoleId: string | null;
  functionType: string | null;
  authorityLevel: number | null;
  responsibilityLevel: number | null;
  errorMessage: string | null;
};

type SpaceOwnershipRow = {
  id: string | null;
  owner_user_id: string | null;
  status: string | null;
};

type ActorRow = {
  id: string | null;
  actor_type: string | null;
  person_id: string | null;
  organization_id: string | null;
  display_name: string | null;
  status: string | null;
};

type ActorSpaceRoleRow = {
  id: string | null;
  actor_id: string | null;
  space_id: string | null;
  function_type: string | null;
  is_active: boolean | null;
  authority_level: number | null;
  responsibility_level: number | null;
};

type OrganizationOwnershipRow = {
  id: string | null;
  created_by_user_id: string | null;
  organization_name: string | null;
  organization_type: string | null;
  status: string | null;
};

const SPACES_SELECTED_COLUMNS = 'id,owner_user_id,status' as const;
const ACTORS_SELECTED_COLUMNS = 'id,actor_type,person_id,organization_id,display_name,status' as const;
const ACTOR_SPACE_ROLES_SELECTED_COLUMNS =
  'id,actor_id,space_id,function_type,is_active,authority_level,responsibility_level' as const;
const ORGANIZATIONS_SELECTED_COLUMNS =
  'id,created_by_user_id,organization_name,organization_type,status' as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeOptionalId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isActiveStatus(status: string | null): boolean {
  return status === 'active';
}

function rowsFromData<RowType>(data: unknown): RowType[] {
  return Array.isArray(data) ? (data as RowType[]) : [];
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;

    if (typeof maybeMessage === 'string') {
      return maybeMessage;
    }
  }

  return 'Unknown ownership/context lookup error.';
}

function buildOwnershipContextResult(
  overrides: Partial<ControlledActivityIntakeOwnershipContextResolutionReadOnlyResult>,
): ControlledActivityIntakeOwnershipContextResolutionReadOnlyResult {
  return {
    executed: true,
    status: 'not_executed',
    resolved: false,
    dbReadExecuted: false,
    failClosed: true,
    selectedContextScope: 'none',
    requestedContextAcceptedAsHintOnly: true,
    mappedAppUserRequired: true,
    ownedSpaceResolved: false,
    actorSpaceRoleResolved: false,
    creatorOrganizationResolved: false,
    organizationActorResolved: false,
    responseSanitized: true,
    appUserId: null,
    actorId: null,
    spaceId: null,
    organizationId: null,
    actorSpaceRoleId: null,
    functionType: null,
    authorityLevel: null,
    responsibilityLevel: null,
    errorMessage: null,
    ...overrides,
  };
}

function hasInvalidRequestedId(
  requestedActorId: string | null,
  requestedSpaceId: string | null,
  requestedOrganizationId: string | null,
): boolean {
  return [requestedActorId, requestedSpaceId, requestedOrganizationId].some(
    (value) => value !== null && !isValidUuid(value),
  );
}

export async function resolveControlledActivityIntakeOwnershipContextReadOnly(
  input: ControlledActivityIntakeOwnershipContextResolutionReadOnlyInput,
): Promise<ControlledActivityIntakeOwnershipContextResolutionReadOnlyResult> {
  const mappedAppUserId = normalizeOptionalId(input.mappedAppUserId);
  const requestedActorId = normalizeOptionalId(input.requestedActorId);
  const requestedSpaceId = normalizeOptionalId(input.requestedSpaceId);
  const requestedOrganizationId = normalizeOptionalId(input.requestedOrganizationId);

  if (!mappedAppUserId) {
    return buildOwnershipContextResult({
      status: 'missing_mapped_app_user',
      failClosed: true,
    });
  }

  if (!isValidUuid(mappedAppUserId)) {
    return buildOwnershipContextResult({
      status: 'requested_context_invalid',
      appUserId: mappedAppUserId,
      failClosed: true,
    });
  }

  if (hasInvalidRequestedId(requestedActorId, requestedSpaceId, requestedOrganizationId)) {
    return buildOwnershipContextResult({
      status: 'requested_context_invalid',
      appUserId: mappedAppUserId,
      failClosed: true,
    });
  }

  if (!requestedSpaceId && !requestedOrganizationId) {
    return buildOwnershipContextResult({
      status: 'missing_requested_context',
      appUserId: mappedAppUserId,
      failClosed: true,
    });
  }

  if (requestedSpaceId && requestedOrganizationId) {
    return buildOwnershipContextResult({
      status: 'context_ambiguous',
      appUserId: mappedAppUserId,
      failClosed: true,
    });
  }

  const supabase = getSupabaseAdminClient();

  if (requestedSpaceId) {
    try {
      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .select(SPACES_SELECTED_COLUMNS)
        .eq('id', requestedSpaceId)
        .limit(2);

      if (spaceError) {
        return buildOwnershipContextResult({
          status: 'context_lookup_error',
          appUserId: mappedAppUserId,
          spaceId: requestedSpaceId,
          dbReadExecuted: true,
          failClosed: true,
          errorMessage: errorToMessage(spaceError),
        });
      }

      const spaceRows = rowsFromData<SpaceOwnershipRow>(spaceData);

      if (spaceRows.length === 0) {
        return buildOwnershipContextResult({
          status: 'owned_space_not_found',
          appUserId: mappedAppUserId,
          spaceId: requestedSpaceId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      if (spaceRows.length > 1) {
        return buildOwnershipContextResult({
          status: 'context_ambiguous',
          appUserId: mappedAppUserId,
          spaceId: requestedSpaceId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      const space = spaceRows[0];

      if (space.owner_user_id !== mappedAppUserId) {
        return buildOwnershipContextResult({
          status: 'owned_space_not_owned_by_mapped_user',
          appUserId: mappedAppUserId,
          spaceId: requestedSpaceId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      if (!isActiveStatus(space.status)) {
        return buildOwnershipContextResult({
          status: 'owned_space_inactive',
          appUserId: mappedAppUserId,
          spaceId: requestedSpaceId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      if (!requestedActorId) {
        return buildOwnershipContextResult({
          status: 'owned_space_resolved',
          resolved: true,
          dbReadExecuted: true,
          failClosed: false,
          selectedContextScope: 'personal_space',
          appUserId: mappedAppUserId,
          spaceId: requestedSpaceId,
          ownedSpaceResolved: true,
        });
      }

      const { data: actorData, error: actorError } = await supabase
        .from('actors')
        .select(ACTORS_SELECTED_COLUMNS)
        .eq('id', requestedActorId)
        .limit(2);

      if (actorError) {
        return buildOwnershipContextResult({
          status: 'context_lookup_error',
          appUserId: mappedAppUserId,
          actorId: requestedActorId,
          spaceId: requestedSpaceId,
          dbReadExecuted: true,
          failClosed: true,
          errorMessage: errorToMessage(actorError),
        });
      }

      const actorRows = rowsFromData<ActorRow>(actorData);

      if (actorRows.length === 0) {
        return buildOwnershipContextResult({
          status: 'actor_not_found',
          appUserId: mappedAppUserId,
          actorId: requestedActorId,
          spaceId: requestedSpaceId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      if (actorRows.length > 1) {
        return buildOwnershipContextResult({
          status: 'context_ambiguous',
          appUserId: mappedAppUserId,
          actorId: requestedActorId,
          spaceId: requestedSpaceId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      const actor = actorRows[0];

      if (!isActiveStatus(actor.status)) {
        return buildOwnershipContextResult({
          status: 'actor_inactive',
          appUserId: mappedAppUserId,
          actorId: requestedActorId,
          spaceId: requestedSpaceId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      const { data: roleData, error: roleError } = await supabase
        .from('actor_space_roles')
        .select(ACTOR_SPACE_ROLES_SELECTED_COLUMNS)
        .eq('actor_id', requestedActorId)
        .eq('space_id', requestedSpaceId)
        .limit(2);

      if (roleError) {
        return buildOwnershipContextResult({
          status: 'context_lookup_error',
          appUserId: mappedAppUserId,
          actorId: requestedActorId,
          spaceId: requestedSpaceId,
          dbReadExecuted: true,
          failClosed: true,
          errorMessage: errorToMessage(roleError),
        });
      }

      const roleRows = rowsFromData<ActorSpaceRoleRow>(roleData);

      if (roleRows.length === 0) {
        return buildOwnershipContextResult({
          status: 'actor_space_role_not_found',
          appUserId: mappedAppUserId,
          actorId: requestedActorId,
          spaceId: requestedSpaceId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      if (roleRows.length > 1) {
        return buildOwnershipContextResult({
          status: 'context_ambiguous',
          appUserId: mappedAppUserId,
          actorId: requestedActorId,
          spaceId: requestedSpaceId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      const role = roleRows[0];

      if (role.is_active !== true) {
        return buildOwnershipContextResult({
          status: 'actor_space_role_inactive',
          appUserId: mappedAppUserId,
          actorId: requestedActorId,
          spaceId: requestedSpaceId,
          actorSpaceRoleId: role.id,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      return buildOwnershipContextResult({
        status: 'actor_space_role_resolved',
        resolved: true,
        dbReadExecuted: true,
        failClosed: false,
        selectedContextScope: 'personal_space',
        appUserId: mappedAppUserId,
        actorId: requestedActorId,
        spaceId: requestedSpaceId,
        actorSpaceRoleId: role.id,
        functionType: role.function_type,
        authorityLevel: role.authority_level,
        responsibilityLevel: role.responsibility_level,
        ownedSpaceResolved: true,
        actorSpaceRoleResolved: true,
      });
    } catch (error) {
      return buildOwnershipContextResult({
        status: 'context_lookup_error',
        appUserId: mappedAppUserId,
        actorId: requestedActorId,
        spaceId: requestedSpaceId,
        dbReadExecuted: true,
        failClosed: true,
        errorMessage: errorToMessage(error),
      });
    }
  }

  if (requestedOrganizationId) {
    try {
      const { data: organizationData, error: organizationError } = await supabase
        .from('organizations')
        .select(ORGANIZATIONS_SELECTED_COLUMNS)
        .eq('id', requestedOrganizationId)
        .limit(2);

      if (organizationError) {
        return buildOwnershipContextResult({
          status: 'context_lookup_error',
          appUserId: mappedAppUserId,
          organizationId: requestedOrganizationId,
          dbReadExecuted: true,
          failClosed: true,
          errorMessage: errorToMessage(organizationError),
        });
      }

      const organizationRows = rowsFromData<OrganizationOwnershipRow>(organizationData);

      if (organizationRows.length === 0) {
        return buildOwnershipContextResult({
          status: 'organization_not_found',
          appUserId: mappedAppUserId,
          organizationId: requestedOrganizationId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      if (organizationRows.length > 1) {
        return buildOwnershipContextResult({
          status: 'context_ambiguous',
          appUserId: mappedAppUserId,
          organizationId: requestedOrganizationId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      const organization = organizationRows[0];

      if (organization.created_by_user_id !== mappedAppUserId) {
        return buildOwnershipContextResult({
          status: 'organization_not_created_by_mapped_user',
          appUserId: mappedAppUserId,
          organizationId: requestedOrganizationId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      if (!isActiveStatus(organization.status)) {
        return buildOwnershipContextResult({
          status: 'organization_inactive',
          appUserId: mappedAppUserId,
          organizationId: requestedOrganizationId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      if (!requestedActorId) {
        return buildOwnershipContextResult({
          status: 'creator_organization_resolved',
          resolved: true,
          dbReadExecuted: true,
          failClosed: false,
          selectedContextScope: 'organization_creator',
          appUserId: mappedAppUserId,
          organizationId: requestedOrganizationId,
          creatorOrganizationResolved: true,
        });
      }

      const { data: actorData, error: actorError } = await supabase
        .from('actors')
        .select(ACTORS_SELECTED_COLUMNS)
        .eq('id', requestedActorId)
        .limit(2);

      if (actorError) {
        return buildOwnershipContextResult({
          status: 'context_lookup_error',
          appUserId: mappedAppUserId,
          actorId: requestedActorId,
          organizationId: requestedOrganizationId,
          dbReadExecuted: true,
          failClosed: true,
          errorMessage: errorToMessage(actorError),
        });
      }

      const actorRows = rowsFromData<ActorRow>(actorData);

      if (actorRows.length === 0) {
        return buildOwnershipContextResult({
          status: 'organization_actor_not_found',
          appUserId: mappedAppUserId,
          actorId: requestedActorId,
          organizationId: requestedOrganizationId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      if (actorRows.length > 1) {
        return buildOwnershipContextResult({
          status: 'context_ambiguous',
          appUserId: mappedAppUserId,
          actorId: requestedActorId,
          organizationId: requestedOrganizationId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      const actor = actorRows[0];

      if (!isActiveStatus(actor.status)) {
        return buildOwnershipContextResult({
          status: 'actor_inactive',
          appUserId: mappedAppUserId,
          actorId: requestedActorId,
          organizationId: requestedOrganizationId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      if (actor.organization_id !== requestedOrganizationId) {
        return buildOwnershipContextResult({
          status: 'organization_actor_mismatch',
          appUserId: mappedAppUserId,
          actorId: requestedActorId,
          organizationId: requestedOrganizationId,
          dbReadExecuted: true,
          failClosed: true,
        });
      }

      return buildOwnershipContextResult({
        status: 'organization_actor_resolved',
        resolved: true,
        dbReadExecuted: true,
        failClosed: false,
        selectedContextScope: 'organization_creator',
        appUserId: mappedAppUserId,
        actorId: requestedActorId,
        organizationId: requestedOrganizationId,
        creatorOrganizationResolved: true,
        organizationActorResolved: true,
      });
    } catch (error) {
      return buildOwnershipContextResult({
        status: 'context_lookup_error',
        appUserId: mappedAppUserId,
        actorId: requestedActorId,
        organizationId: requestedOrganizationId,
        dbReadExecuted: true,
        failClosed: true,
        errorMessage: errorToMessage(error),
      });
    }
  }

  return buildOwnershipContextResult({
    status: 'missing_requested_context',
    appUserId: mappedAppUserId,
    failClosed: true,
  });
}