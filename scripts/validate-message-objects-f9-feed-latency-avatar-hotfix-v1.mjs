import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}
function must(text, pattern, code) {
  if (!pattern.test(text)) throw new Error(code);
}
function mustNot(text, pattern, code) {
  if (pattern.test(text)) throw new Error(code);
}

const authors = read("src/lib/messages/publicationAuthors.server.ts");
const feedServer = read("src/lib/messages/globalFeed.server.ts");
const feedContent = read("src/app/feed/GlobalFeedContent.tsx");
const visibilityButton = read("src/components/messages/HidePublicationButton.tsx");
const visibilityRoute = read("src/app/api/publications/[id]/visibility/route.ts");
const publicationRoute = read("src/app/api/publications/route.ts");
const recovery = read(
  "docs/recovery/ARCTOR_MESSAGE_OBJECTS_F9_FEED_LATENCY_AVATAR_HOTFIX_V1_RU.md",
);

must(authors, /actor_type !== "person" && actor\.actor_type !== "avatar"/, "AVATAR_ACTIVE_ACTOR_GATE_MISSING");
mustNot(authors, /!profile\.is_public[\s\S]*!profile\.public_slug/, "AVATAR_PUBLIC_PROFILE_ONLY_GATE_REMAINS");
must(authors, /destinationRef: profile\.public_slug[\s\S]*`actor:\$\{actor\.id\}`/, "AVATAR_PRIVATE_DESTINATION_FALLBACK_MISSING");
must(feedServer, /\.in\("actor_id", profileActorIds\);/, "FEED_PROFILE_READ_ALL_AUTHORS_MISSING");
mustNot(feedServer, /\.in\("actor_id", profileActorIds\)[\s\S]{0,80}\.eq\("is_public", true\)/, "FEED_PRIVATE_AVATAR_FILTER_REMAINS");
must(feedServer, /publicSlug: hasPublicProfile \? profile\.public_slug : null/, "PRIVATE_AVATAR_NONLINK_AUTHOR_MISSING");
must(feedContent, /data-feed-message-object-id=\{item\.id\}/, "OPTIMISTIC_CARD_TARGET_MISSING");
must(feedContent, /if \(!item\.author\.publicSlug\) return null;/, "PRIVATE_AVATAR_LINK_GUARD_MISSING");
must(visibilityButton, /setCardHidden\(true\)/, "HIDE_OPTIMISTIC_REMOVE_MISSING");
must(visibilityButton, /setCardHidden\(false\)/, "HIDE_ROLLBACK_MISSING");
mustNot(visibilityButton, /router\.refresh\(/, "HIDE_FULL_FEED_REFRESH_REGRESSION");
must(visibilityRoute, /server-timing/, "VISIBILITY_SERVER_TIMING_MISSING");
must(publicationRoute, /Promise\.all\(\[/, "PUBLICATION_PARALLEL_FINALIZATION_MISSING");
must(publicationRoute, /delivery_status: "succeeded"/, "PUBLICATION_DIRECT_SUCCEEDED_DISTRIBUTION_MISSING");
mustNot(publicationRoute, /delivery_status: "pending"/, "PUBLICATION_PENDING_DISTRIBUTION_ROUNDTRIP_REMAINS");
mustNot(publicationRoute, /revalidatePath\("\/feed"\)/, "PUBLICATION_REDUNDANT_REVALIDATE_REMAINS");
must(recovery, /optimistic[\s\S]*avatar[\s\S]*latency/i, "RECOVERY_PERFORMANCE_DECISION_MISSING");
mustNot(authors + feedServer + feedContent + visibilityButton + publicationRoute, /message_object_reactions|review_of|rating/, "OUT_OF_SCOPE_REACTION_REGRESSION");

console.log("ARCTOR_MESSAGE_OBJECTS_F9_FEED_LATENCY_AVATAR_HOTFIX_V1_VALIDATION=PASS");
