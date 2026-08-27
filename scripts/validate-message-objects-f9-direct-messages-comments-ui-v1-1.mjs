import fs from "node:fs";

const requiredFiles = [
  "src/app/messages/page.tsx",
  "src/app/messages/MessagesClient.tsx",
  "src/app/api/direct-messages/route.ts",
  "src/app/api/publications/[id]/comments/route.ts",
  "src/components/messages/PublicationComments.tsx",
  "src/components/app-shell/global-navigation.tsx",
  "src/app/people/[slug]/page.tsx",
  "src/app/feed/GlobalFeedContent.tsx",
  "src/app/directory/[slug]/EnterprisePublicActivityPanel.tsx",
  "src/i18n/messages/personal-profile.ts",
  "docs/recovery/ARCTOR_MESSAGE_OBJECTS_F9_DIRECT_MESSAGES_COMMENTS_UI_V1_1_RU.md",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`F9_REQUIRED_FILE_MISSING:${file}`);
  }
}

function read(file) {
  return fs.readFileSync(file, "utf8");
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

const nav = read("src/components/app-shell/global-navigation.tsx");
must(nav, /icon=\{MessageCircle\}[\s\S]*navigation\.messages[\s\S]*href=\{localeHref\("\/messages"\)\}/, "F9_NAV_MESSAGES_MISSING");
must(nav, /isMessagesActive/, "F9_NAV_ACTIVE_STATE_MISSING");

const profile = read("src/app/people/[slug]/page.tsx");
must(profile, /\/messages\?to=\$\{encodeURIComponent\(profile\.actor_id\)\}/, "F9_PROFILE_DIRECT_MESSAGE_LINK_MISSING");
must(profile, /messages\.sendMessage/, "F9_PROFILE_DIRECT_MESSAGE_COPY_MISSING");

const directApi = read("src/app/api/direct-messages/route.ts");
must(directApi, /list_direct_message_conversations_v1/, "F9_DIRECT_CONVERSATION_RPC_MISSING");
must(directApi, /list_direct_messages_v1/, "F9_DIRECT_READ_RPC_MISSING");
must(directApi, /create_direct_message_object_v1/, "F9_DIRECT_WRITE_RPC_MISSING");
must(directApi, /resolveActiveActorContext/, "F9_DIRECT_ACTOR_CONTEXT_MISSING");
must(directApi, /toMediaDeliveryUrl/, "F9_DIRECT_MEDIA_DELIVERY_MISSING");

const commentsApi = read("src/app/api/publications/[id]/comments/route.ts");
must(commentsApi, /list_publication_comments_v1/, "F9_COMMENT_READ_RPC_MISSING");
must(commentsApi, /create_publication_comment_v1/, "F9_COMMENT_WRITE_RPC_MISSING");
must(commentsApi, /\.eq\("is_public", true\)/, "F9_PUBLIC_COMMENT_AUTHOR_PRIVACY_FILTER_MISSING");
must(commentsApi, /resolveActiveActorContext/, "F9_COMMENT_ACTOR_CONTEXT_MISSING");

const comments = read("src/components/messages/PublicationComments.tsx");
must(comments, /async function toggleComments/, "F9_COMMENT_LAZY_TOGGLE_MISSING");
must(comments, /await loadComments\(\)/, "F9_COMMENT_LAZY_LOAD_MISSING");
must(comments, /maxLength=\{3000\}/, "F9_COMMENT_LENGTH_UI_GUARD_MISSING");

const feed = read("src/app/feed/GlobalFeedContent.tsx");
must(feed, /PublicationComments/, "F9_GLOBAL_FEED_COMMENTS_MISSING");

const enterprise = read(
  "src/app/directory/[slug]/EnterprisePublicActivityPanel.tsx",
);
must(enterprise, /PublicationComments/, "F9_ENTERPRISE_COMMENTS_MISSING");

const messagesPage = read("src/app/messages/MessagesClient.tsx");
must(messagesPage, /\/api\/direct-messages/, "F9_MESSAGES_UI_API_MISSING");
must(messagesPage, /counterpartActorId/, "F9_MESSAGES_UI_THREAD_MISSING");
must(messagesPage, /maxLength=\{5000\}/, "F9_DIRECT_LENGTH_UI_GUARD_MISSING");
mustNot(messagesPage, /selectedConversation/, "F9_MESSAGES_UNUSED_SELECTED_CONVERSATION_REGRESSION");
mustNot(messagesPage, /void\s+loadConversations\(\)/, "F9_MESSAGES_EFFECT_LOADER_REGRESSION");
mustNot(messagesPage, /void\s+loadThread\(/, "F9_MESSAGES_EFFECT_THREAD_LOADER_REGRESSION");

const personalCopy = read("src/i18n/messages/personal-profile.ts");
const sendMessageOccurrences = (personalCopy.match(/sendMessage:/g) ?? []).length;
if (sendMessageOccurrences !== 8) {
  throw new Error(`F9_SEND_MESSAGE_DICTIONARY_COUNT:${sendMessageOccurrences}`);
}

const scopedNewCodeFiles = [
  "src/app/messages/page.tsx",
  "src/app/messages/MessagesClient.tsx",
  "src/app/api/direct-messages/route.ts",
  "src/app/api/publications/[id]/comments/route.ts",
  "src/components/messages/PublicationComments.tsx",
];

for (const file of scopedNewCodeFiles) {
  const text = read(file);
  mustNot(text, /\bmessage_object_reactions\b/i, `F9_REACTION_SCOPE_LEAK:${file}`);
  mustNot(text, /\breview(_of)?\b|\brating\b/i, `F9_REVIEW_SCOPE_LEAK:${file}`);
}

const legacyApi = "src/app/api/messages/route.ts";
if (!fs.existsSync(legacyApi)) {
  throw new Error("F9_LEGACY_CHAT_API_UNEXPECTEDLY_MISSING");
}

console.log("ARCTOR_MESSAGE_OBJECTS_F9_DIRECT_MESSAGES_COMMENTS_UI_V1_1_VALIDATION=PASS");
