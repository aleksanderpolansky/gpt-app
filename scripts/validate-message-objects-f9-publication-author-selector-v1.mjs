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

const helper = read("src/lib/messages/publicationAuthors.server.ts");
const page = read("src/app/feed/page.tsx");
const composer = read("src/app/feed/UserPublicationComposer.tsx");
const copy = read("src/app/feed/feedInteractionCopy.ts");
const route = read("src/app/api/publications/route.ts");
const recovery = read(
  "docs/recovery/ARCTOR_MESSAGE_OBJECTS_F9_PUBLICATION_AUTHOR_SELECTOR_V1_RU.md",
);

must(helper, /actor_public_profiles[\s\S]*owner_user_id/, "AUTHOR_PROFILE_OWNER_SCOPE_MISSING");
must(helper, /organizations[\s\S]*owner_actor_id/, "AUTHOR_ENTERPRISE_OWNER_SCOPE_MISSING");
must(helper, /actor_type", "organization"/, "AUTHOR_ORGANIZATION_ACTOR_MISSING");
must(helper, /!profile\.is_public[\s\S]*!profile\.public_slug/, "AUTHOR_PUBLIC_PROFILE_GATE_MISSING");
must(helper, /destinationRef: `directory:\$\{organization\.public_slug\}`/, "AUTHOR_DIRECTORY_DESTINATION_MISSING");
must(page, /getPublicationAuthorOptionsForUser/, "AUTHOR_OPTIONS_SERVER_READ_MISSING");
must(page, /authorOptions=\{authorOptions\}/, "AUTHOR_OPTIONS_PROP_MISSING");
must(composer, /<select[\s\S]*value=\{authorActorId\}/, "AUTHOR_SELECTOR_UI_MISSING");
must(composer, /formData\.set\("authorActorId", authorActorId\)/, "AUTHOR_SELECTOR_FORMDATA_MISSING");
must(copy, /author: string;[\s\S]*personalProfile: string;[\s\S]*enterprise: string;/, "AUTHOR_SELECTOR_COPY_MISSING");
must(route, /getPublicationAuthorOptionForUser/, "AUTHOR_SERVER_VALIDATION_MISSING");
must(route, /p_author_actor_id: author\.actorId/, "AUTHOR_RPC_BINDING_MISSING");
mustNot(route, /p_author_actor_id:\s*authorActorId/, "BROWSER_AUTHOR_ID_TRUST_REGRESSION");
must(route, /p_created_by_actor_id: actorContext\.actorId/, "CREATOR_AUDIT_MISSING");
must(route, /destination_ref: author\.destinationRef/, "AUTHOR_DESTINATION_MISSING");
must(route, /PUBLICATION_AUTHOR_NOT_ALLOWED/, "AUTHOR_FORBIDDEN_GATE_MISSING");
mustNot(route, /USER_PUBLICATION_PUBLIC_PROFILE_REQUIRED/, "ACTIVE_PROFILE_ONLY_GATE_REMAINS");
must(recovery, /Hide ambiguity[\s\S]*Author selector/i, "RECOVERY_DECISION_MISSING");
mustNot(helper + page + composer + route, /message_object_reactions|review_of|rating/, "REACTION_SCOPE_REGRESSION");

console.log("ARCTOR_MESSAGE_OBJECTS_F9_PUBLICATION_AUTHOR_SELECTOR_V1_VALIDATION=PASS");
