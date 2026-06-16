export type ActivityFactsSaveGateOwnershipContext = {
  readonly mode: "no_write_preview";
  readonly serverDerivedOwnership: true;
  readonly userIdSource: "future_authenticated_server_context";
  readonly actorIdSource: "future_authenticated_actor_mapping";
  readonly ownerActorIdSource: "future_authenticated_actor_mapping";
  readonly organizationIdSource: "not_used_for_personal_activity_facts";
  readonly clientOwnershipFieldsTrusted: false;
  readonly directBrowserSupabaseWriteAllowed: false;
  readonly sharedOrSystemValueObjectReferenceMakesFactPublic: false;
  readonly factRowsRemainPrivateUserOwned: true;
  readonly rlsPosture: "service_mediated_write_required";
  readonly serviceRoleWriteRequired: true;
  readonly authUidMappingMustBeProvenBeforeDirectAuthenticatedAccess: true;
  readonly confirmSaveEnabled: false;
  readonly confirmSaveBlockedBy: "ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED";
  readonly browserWriteRule: "no direct browser Supabase write";
  readonly valueObjectPrivacyRule: "shared/system Value Object reference does not make a fact public";
  readonly ownershipVocabulary: readonly ["user_id", "actor_id", "owner_actor_id"];
};

export function buildNoWriteOwnershipContext(): ActivityFactsSaveGateOwnershipContext {
  return {
    mode: "no_write_preview",
    serverDerivedOwnership: true,
    userIdSource: "future_authenticated_server_context",
    actorIdSource: "future_authenticated_actor_mapping",
    ownerActorIdSource: "future_authenticated_actor_mapping",
    organizationIdSource: "not_used_for_personal_activity_facts",
    clientOwnershipFieldsTrusted: false,
    directBrowserSupabaseWriteAllowed: false,
    sharedOrSystemValueObjectReferenceMakesFactPublic: false,
    factRowsRemainPrivateUserOwned: true,
    rlsPosture: "service_mediated_write_required",
    serviceRoleWriteRequired: true,
    authUidMappingMustBeProvenBeforeDirectAuthenticatedAccess: true,
    confirmSaveEnabled: false,
    confirmSaveBlockedBy: "ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED",
    browserWriteRule: "no direct browser Supabase write",
    valueObjectPrivacyRule: "shared/system Value Object reference does not make a fact public",
    ownershipVocabulary: ["user_id", "actor_id", "owner_actor_id"],
  };
}