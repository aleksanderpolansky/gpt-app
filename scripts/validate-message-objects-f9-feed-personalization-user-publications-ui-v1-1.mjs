import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function must(text, pattern, code) {
  if (!pattern.test(text)) {
    throw new Error(code);
  }
}

function mustNot(text, pattern, code) {
  if (pattern.test(text)) {
    throw new Error(code);
  }
}

const requiredPaths = [
  "src/app/api/publications/route.ts",
  "src/app/api/publications/[id]/comments/route.ts",
  "src/app/api/publications/[id]/visibility/route.ts",
  "src/app/feed/page.tsx",
  "src/app/feed/hidden/page.tsx",
  "src/app/feed/GlobalFeedContent.tsx",
  "src/app/feed/UserPublicationComposer.tsx",
  "src/app/feed/feedCopy.ts",
  "src/app/feed/feedInteractionCopy.ts",
  "src/components/messages/PublicationComments.tsx",
  "src/components/messages/HidePublicationButton.tsx",
  "src/lib/messages/commentCounts.server.ts",
  "src/lib/messages/feedViewerPreferences.server.ts",
  "src/lib/messages/globalFeed.server.ts",
  "src/lib/messages/enterpriseMessages.server.ts",
  "src/components/app-shell/global-navigation.tsx",
  "src/i18n/messages/navigation.ts",
  "src/app/directory/[slug]/EnterprisePublicActivityPanel.tsx",
  "docs/recovery/ARCTOR_MESSAGE_OBJECTS_F9_FEED_PERSONALIZATION_USER_PUBLICATIONS_UI_V1_1_RU.md",
];

for (const relativePath of requiredPaths) {
  if (!exists(relativePath)) {
    throw new Error(`F9_FEED_REQUIRED_PATH_MISSING:${relativePath}`);
  }
}

const globalFeed = read("src/lib/messages/globalFeed.server.ts");
must(globalFeed, /actor_type === "person"/, "F9_FEED_PERSON_AUTHOR_MISSING");
must(globalFeed, /actor_type === "avatar"/, "F9_FEED_AVATAR_AUTHOR_MISSING");
must(globalFeed, /actor_public_profiles/, "F9_FEED_PROFILE_PROJECTION_MISSING");
must(globalFeed, /commentCount:/, "F9_FEED_COMMENT_COUNT_MISSING");
must(globalFeed, /getPublicCommentCountMap/, "F9_FEED_COMMENT_BATCH_MISSING");
must(globalFeed, /excludeMessageObjectIds/, "F9_FEED_HIDDEN_EXCLUDE_MISSING");
must(globalFeed, /includeOnlyMessageObjectIds/, "F9_FEED_HIDDEN_INCLUDE_MISSING");

const commentCount = read("src/lib/messages/commentCounts.server.ts");
must(commentCount, /message_object_relations/, "F9_COMMENT_COUNT_RELATION_MISSING");
must(commentCount, /intent_code", "comment"/, "F9_COMMENT_COUNT_ACTIVE_COMMENT_GUARD_MISSING");
if ((commentCount.match(/\.from\("message_object_relations"\)/g) ?? []).length !== 1) {
  throw new Error("F9_COMMENT_COUNT_RELATION_BATCH_REGRESSION");
}
if ((commentCount.match(/\.from\("message_objects"\)/g) ?? []).length !== 1) {
  throw new Error("F9_COMMENT_COUNT_MESSAGE_BATCH_REGRESSION");
}

const comments = read("src/components/messages/PublicationComments.tsx");
must(comments, /initialCount/, "F9_COMMENT_INITIAL_COUNT_PROP_MISSING");
must(comments, /commentCount/, "F9_COMMENT_COUNT_STATE_MISSING");
must(comments, /comments\?locale=/, "F9_COMMENT_LOCALE_QUERY_MISSING");

const commentsRoute = read(
  "src/app/api/publications/[id]/comments/route.ts",
);
must(
  commentsRoute,
  /ensurePublicMessageObjectLocalizationsV1/,
  "F9_COMMENT_LOCALIZATION_HELPER_MISSING",
);
must(
  commentsRoute,
  /PUBLICATION_COMMENT_LOCALIZATION_READ_FAILED/,
  "F9_COMMENT_LOCALIZATION_SOURCE_READ_MISSING",
);

must(
  commentsRoute,
  /contentText:\s*row\.content_text,\s*metadataJson:\s*row\.metadata_json/,
  "F9_COMMENT_LOCALIZATION_CANONICAL_SOURCE_MISSING",
);

const localizationDeclarationIndex = commentsRoute.indexOf(
  "const localization =",
);
const localizationLookupIndex = commentsRoute.indexOf(
  "localization.contentTextById.get(",
);

if (
  localizationDeclarationIndex < 0 ||
  localizationLookupIndex < 0 ||
  localizationLookupIndex < localizationDeclarationIndex
) {
  throw new Error("F9_COMMENT_LOCALIZATION_USE_BEFORE_DECLARATION_REGRESSION");
}

const localizationSourceLoopStart = commentsRoute.indexOf(
  "for (const row of (localizationRows",
);
const localizationSourceLoopEnd = localizationDeclarationIndex;

if (
  localizationSourceLoopStart < 0 ||
  localizationSourceLoopEnd <= localizationSourceLoopStart
) {
  throw new Error("F9_COMMENT_LOCALIZATION_SOURCE_LOOP_MISSING");
}

const localizationSourceLoop = commentsRoute.slice(
  localizationSourceLoopStart,
  localizationSourceLoopEnd,
);

mustNot(
  localizationSourceLoop,
  /row\.comment_message_object_id/,
  "F9_COMMENT_LOCALIZATION_ROW_SHAPE_REGRESSION",
);

must(
  commentsRoute,
  /localization\.contentTextById\.get\(row\.comment_message_object_id\)/,
  "F9_COMMENT_LOCALIZED_RESPONSE_MISSING",
);

const userApi = read("src/app/api/publications/route.ts");
must(userApi, /create_message_object_v1/, "F9_USER_PUBLICATION_CREATE_RPC_MISSING");
must(userApi, /p_author_actor_id:\s*actorContext\.actorId/, "F9_USER_PUBLICATION_AUTHOR_MISMATCH");
must(userApi, /USER_PUBLICATION_PUBLIC_PROFILE_REQUIRED/, "F9_USER_PUBLIC_PROFILE_GATE_MISSING");
must(userApi, /message_object_distributions/, "F9_USER_PUBLICATION_DISTRIBUTION_MISSING");
must(userApi, /delivery_status:\s*"succeeded"/, "F9_USER_PUBLICATION_DELIVERY_MISSING");
must(userApi, /persistMediaImageValue/, "F9_USER_PUBLICATION_MEDIA_PIPELINE_MISSING");

const composer = read("src/app/feed/UserPublicationComposer.tsx");
must(composer, /optimizePublicationImage/, "F9_USER_COMPOSER_IMAGE_OPTIMIZER_MISSING");
must(composer, /photoInputRef\.current\?\.click\(\)/, "F9_USER_COMPOSER_FILE_PICKER_FIX_MISSING");
must(composer, /focus\(\{ preventScroll: true \}\)/, "F9_USER_COMPOSER_FOCUS_SCROLL_GUARD_MISSING");
must(composer, /fetch\("\/api\/publications"/, "F9_USER_COMPOSER_API_MISSING");

const visibility = read(
  "src/app/api/publications/[id]/visibility/route.ts",
);
must(visibility, /hide_message_object_for_viewer_v1/, "F9_HIDE_RPC_MISSING");
must(visibility, /restore_message_object_for_viewer_v1/, "F9_RESTORE_RPC_MISSING");
must(visibility, /resolveActiveActorContext/, "F9_HIDE_ACTOR_CONTEXT_MISSING");

const viewer = read("src/lib/messages/feedViewerPreferences.server.ts");
must(viewer, /list_hidden_message_object_ids_v1/, "F9_HIDDEN_LIST_RPC_MISSING");
must(viewer, /canPublishPublicly/, "F9_PUBLIC_COMPOSER_CAPABILITY_MISSING");

const hiddenPage = read("src/app/feed/hidden/page.tsx");
must(hiddenPage, /mode="hidden"/, "F9_HIDDEN_PAGE_MODE_MISSING");
must(hiddenPage, /hiddenMessageObjectIds/, "F9_HIDDEN_PAGE_IDS_MISSING");

const nav = read("src/components/app-shell/global-navigation.tsx");
must(nav, /navigation\.hiddenPublications/, "F9_HIDDEN_NAV_LINK_MISSING");
must(nav, /\/feed\/hidden/, "F9_HIDDEN_NAV_PATH_MISSING");

const enterprisePanel = read(
  "src/app/directory/[slug]/EnterprisePublicActivityPanel.tsx",
);
must(enterprisePanel, /initialCount=\{message\.commentCount\}/, "F9_ENTERPRISE_INITIAL_COMMENT_COUNT_MISSING");

for (const relativePath of requiredPaths) {
  const text = read(relativePath);
  if (/[ \t]+$/m.test(text)) {
    throw new Error(`F9_TRAILING_WHITESPACE:${relativePath}`);
  }
}

console.log(
  "ARCTOR_MESSAGE_OBJECTS_F9_FEED_PERSONALIZATION_USER_PUBLICATIONS_UI_V1_1_VALIDATION=PASS",
);
