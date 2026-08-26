import fs from "node:fs";
import crypto from "node:crypto";

const sqlPath = "supabase/manual-applied/20260826_message_objects_core_f1_db_foundation_v1.sql";
const postPath = "supabase/diagnostics/20260826_message_objects_core_f1_postcheck_readonly_v1.sql";
const recoveryPath = "docs/recovery/ARCTOR_MESSAGE_OBJECTS_CORE_F1_DB_FOUNDATION_V1_RU.md";
const evidencePath = "docs/recovery/evidence/MESSAGE_OBJECTS/ARCTOR_MESSAGE_OBJECTS_CORE_F1_DB_ACCEPTANCE_20260826.txt";

const read = (p) => fs.readFileSync(p, "utf8");
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const executable = (text) =>
  text.split(/\r?\n/).filter((line) => !line.trimStart().startsWith("--")).join("\n")
      .replace(/\/\*[\s\S]*?\*\//g, " ");

const sql = read(sqlPath);
const post = read(postPath);
const recovery = read(recoveryPath);
const evidence = read(evidencePath);
const sqlExec = executable(sql);
const postExec = executable(post);

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check("FOUNDATION_SHA", sha(sqlPath) === "f42cfa9746f46507050822c4a4a6313c37353f83725b61218a2b1c6fe7030b3d");
check("POSTCHECK_SHA", sha(postPath) === "5ec30b5489c560cbc10ab557f2a408578044faaa4cf61c336a71bf73e57dd619");

for (const table of [
  "message_objects",
  "message_object_audience_actors",
  "message_object_relations",
  "message_object_distributions",
  "message_object_media",
]) {
  check(`TABLE_${table}`, sql.includes(`create table if not exists public.${table}`));
  check(`RLS_${table}`, sql.includes(`alter table public.${table} enable row level security;`));
}

check("CREATE_RPC", sql.includes("create or replace function public.create_message_object_v1"));
check("ACTIVATE_RPC", sql.includes("create or replace function public.activate_message_object_v1"));
check("WITHDRAW_RPC", sql.includes("create or replace function public.withdraw_message_object_v1"));
check("ACTOR_CONTROL", sql.includes("message_actor_controlled_by_user_v1"));
check("SERVICE_ROLE_CREATE", sql.includes("grant execute on function public.create_message_object_v1"));
check("NO_DROP_TABLE_STATEMENT", !/(^|;)\s*drop\s+table\b/im.test(sqlExec));
check("NO_DELETE_STATEMENT", !/(^|;)\s*delete\s+from\b/im.test(sqlExec));
check("NO_TRUNCATE_STATEMENT", !/(^|;)\s*truncate\b/im.test(sqlExec));
check("POSTCHECK_READONLY", !/(^|;)\s*(insert\s+into|update\s+public\.|delete\s+from|drop\s+table|alter\s+table|create\s+table)\b/im.test(postExec));
check("RECOVERY_ENTITY", recovery.includes("универсальная сущность `message_objects`"));
check("RECOVERY_FEED", recovery.includes("`Feed` не является фундаментальной сущностью"));
check("RECOVERY_F2", recovery.includes("F2 Native ARCTor Message / Enterprise Publication"));
check("RECOVERY_CHAT", recovery.includes("Legacy `public.chat_messages` сохранён"));
check("RECOVERY_PASS", recovery.includes("PASS,true,true,true,true,true,true,true,true,true,true"));
check("EVIDENCE_PASS", evidence.includes("PASS,true,true,true,true,true,true,true,true,true,true"));
check("EVIDENCE_SHA", evidence.includes("MANUAL_SQL_SHA256=f42cfa9746f46507050822c4a4a6313c37353f83725b61218a2b1c6fe7030b3d"));

const failed = checks.filter((x) => !x.pass);
const result = {
  release: "ARCTOR_MESSAGE_OBJECTS_CORE_F1_SOURCE_CHECKPOINT_V1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.allPass ? 0 : 1);
