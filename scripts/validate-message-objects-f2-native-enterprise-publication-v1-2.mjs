import fs from "node:fs";

const files = {
  page: "src/app/directory/[slug]/page.tsx",
  panel: "src/app/directory/[slug]/EnterprisePublicActivityPanel.tsx",
  route: "src/app/api/organizations/[id]/messages/route.ts",
  helper: "src/lib/messages/enterpriseMessages.server.ts",
  recovery: "docs/recovery/ARCTOR_MESSAGE_OBJECTS_F2_NATIVE_ENTERPRISE_PUBLICATION_V1_2_RU.md",
};

const read = (path) => fs.readFileSync(path, "utf8");

const page = read(files.page);
const panel = read(files.panel);
const route = read(files.route);
const helper = read(files.helper);
const recovery = read(files.recovery);

const checks = [];
const check = (name, condition) =>
  checks.push({ name, pass: Boolean(condition) });

check("HELPER_CORRECT_SUPABASE_IMPORT",
  helper.includes('import { supabase } from "../../../lib/supabase";'));
check("HELPER_OLD_BROKEN_IMPORT_ABSENT",
  !helper.includes('import { supabase } from "../supabase";'));

check("PAGE_IMPORTS_PANEL", page.includes('import EnterprisePublicActivityPanel from "./EnterprisePublicActivityPanel";'));
check("PAGE_IMPORTS_HELPER", page.includes("getPublicEnterpriseMessages"));
check("PAGE_LOADS_PUBLIC_MESSAGES", page.includes("const publicMessagesPromise = organization"));
check("PAGE_ACTIVITY_PANEL", page.includes("<EnterprisePublicActivityPanel"));
check("PAGE_OWNER_GATE_PROP", page.includes("canPublish={isOrganizationOwner}"));

check("PANEL_CLIENT_COMPONENT", panel.startsWith('"use client";'));
check("PANEL_POSTS_TO_ORG_API", panel.includes('/api/organizations/${encodeURIComponent(organizationId)}/messages'));
check("PANEL_5000_LIMIT", panel.includes("maxLength={5000}"));
check("PANEL_REFRESHES_SERVER_VIEW", panel.includes("router.refresh()"));
check("PANEL_OWNER_ONLY_COMPOSER", panel.includes("{canPublish ? ("));

check("ROUTE_AUTH0", route.includes("auth0.getSession()"));
check("ROUTE_ACTIVE_ACTOR_CONTEXT", route.includes("resolveActiveActorContext"));
check("ROUTE_OWNER_CHECK", route.includes("organization.owner_actor_id !== input.actorId"));
check("ROUTE_ORGANIZATION_ACTOR", route.includes('.eq("actor_type", "organization")'));
check("ROUTE_CREATE_RPC", route.includes('"create_message_object_v1"'));
check("ROUTE_ACTIVATE_RPC", route.includes('"activate_message_object_v1"'));
check("ROUTE_PUBLIC_AUDIENCE", route.includes('p_audience_scope_code: "public"'));
check("ROUTE_NATIVE_ORIGIN", route.includes('p_origin_kind_code: "native"'));
check("ROUTE_ARCTOR_ORIGIN", route.includes('p_origin_provider_code: "arctor"'));
check("ROUTE_ARCTOR_DISTRIBUTION", route.includes('channel_code: "arctor"'));
check("ROUTE_PENDING_BEFORE_ACTIVATION", route.includes('delivery_status: "pending"'));
check("ROUTE_SUCCEEDED_AFTER_ACTIVATION", route.includes('delivery_status: "succeeded"'));
check("ROUTE_CLEANUP_ON_FAILURE", route.split("cleanupMessageObject(").length >= 4);
check("ROUTE_REVALIDATES_DIRECTORY", route.includes("revalidatePath(`/directory/${organization.public_slug}`)"));

check("HELPER_PUBLIC_ONLY", helper.includes('.eq("audience_scope_code", "public")'));
check("HELPER_ACTIVE_ONLY", helper.includes('.eq("lifecycle_status", "active")'));
check("HELPER_ARCTOR_ONLY", helper.includes('.eq("channel_code", "arctor")'));
check("HELPER_SUCCEEDED_ONLY", helper.includes('.eq("delivery_status", "succeeded")'));

check("RECOVERY_IMPORT_FAILURE_RECORDED", recovery.includes("TS2307 Cannot find module '../supabase'"));
check("RECOVERY_CORRECT_IMPORT_RECORDED", recovery.includes("../../../lib/supabase"));
check("RECOVERY_ROLLBACK_RECORDED", recovery.includes("ROLLBACK_TO_BASELINE=PASS"));
check("RECOVERY_BASELINE_RECORDED", recovery.includes("c023fa6d2fb3b067ceaa9e0d4bdbe5a03adda8cb"));

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_MESSAGE_OBJECTS_F2_NATIVE_ENTERPRISE_PUBLICATION_V1_2",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exit(result.allPass ? 0 : 1);
