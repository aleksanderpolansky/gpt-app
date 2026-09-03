import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function resolveClient() {
  const url = text(process.env.SUPABASE_URL);
  const key = text(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("CURATOR_PROCESSING_LOG_PREFLIGHT_ENV_MISSING");
  const requireFromRepo = createRequire(path.join(process.cwd(), "package.json"));
  const { createClient } = requireFromRepo("@supabase/supabase-js");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function preflight() {
  const supabase = resolveClient();
  const checks = [
    supabase.from("raw_activity_signals").select("id,user_id,source_type,idempotency_key").limit(1),
    supabase.from("activity_processing_logs").select("id,raw_signal_id,processor_name,processor_version,metadata_json,started_at,created_at").limit(1),
    supabase.from("app_users").select("id,name,email").limit(1),
    supabase.from("activity_templates").select("id,title,owner_user_id,owner_actor_id,template_scope,status,is_active").limit(1),
  ];
  const results = await Promise.all(checks);
  for (const result of results) {
    if (result.error) {
      throw new Error(`CURATOR_PROCESSING_LOG_PREFLIGHT_FAILED:${result.error.message}`);
    }
  }
  console.log("CURATOR_PROCESSING_LOG_DB_PREFLIGHT: PASS");
}

function selfTest() {
  if (process.argv.includes("--preflight")) throw new Error("SELFTEST_ARGUMENT_COLLISION");
  console.log("SELF_TEST: PASS");
}

if (process.argv.includes("--self-test")) selfTest();
else if (process.argv.includes("--preflight")) await preflight();
else throw new Error("Use --self-test or --preflight");
