import fs from "node:fs";

const checks = [];

function source(path) {
  if (!fs.existsSync(path)) throw new Error(`MISSING_FILE:${path}`);
  return fs.readFileSync(path, "utf8");
}

function check(name, ok) {
  if (!ok) throw new Error(`FAIL ${name}`);
  console.log(`PASS ${name}`);
  checks.push(name);
}

const api = source("src/app/api/admin/relation-constructor/route.ts");
const page = source("src/app/admin/relation-constructor/page.tsx");
const map = source("src/components/workspace/value-objects/value-object-relationship-map.tsx");
const relations = source("src/app/api/value-objects/[id]/relations/route.ts");

check("FILE_RELATION_CONSTRUCTOR_API", api.includes("admin-relation-constructor-v1"));
check("FILE_RELATION_CONSTRUCTOR_UI", page.includes("Конструктор связей"));
check("FOUR_FIELD_SOURCE", page.includes("1. {copy.source}"));
check("FOUR_FIELD_TARGET", page.includes("2. {copy.target}"));
check("FOUR_FIELD_TYPE", page.includes("3. {copy.relation}"));
check("FOUR_FIELD_COMMENT", page.includes("4. {copy.comment}"));
check("NO_TYPICAL_ACTIVITY_FIELD", !page.includes("typicalActivity") && !api.includes("typicalActivity"));
check("COMMENT_REQUIRED", api.includes("RELATION_CONSTRUCTOR_COMMENT_REQUIRED"));
check("COMMENT_PERSISTED_CURATOR_LOG", api.includes("curatorComment: input.comment"));
check("CANONICAL_SYSTEM_RELATION_WRITE", api.includes('.from("system_value_object_relations")'));
check("RELATION_TYPE_CLOSED_REGISTRY", api.includes('canonical_write_policy_code", "enabled"') || api.includes('canonical_write_policy_code", "enabled'));
check("NO_SELF_LINK", api.includes("RELATION_CONSTRUCTOR_SELF_LINK_FORBIDDEN"));
check("MAP_ADD_BUTTON", map.includes("/admin/relation-constructor?sourceValueObjectId="));
check("MAP_BUTTON_LOCALIZED", map.includes("{copy.addRelation}"));
check("SYSTEM_RELATIONS_READ_ON_MAP", relations.includes('.from("system_value_object_relations")'));
check("SYSTEM_MAP_RELATIONS_NOT_EMPTY_LITERAL", !relations.includes("relations: [],\n    };\n\n    return NextResponse.json(response"));
check("NO_FORMULA_WRITE", !api.includes("formula") && !page.includes("formula"));
check("NO_CONSEQUENCE_CONTEXT_WRITE", !api.includes("consequence_constructor_task"));
check("NO_SQL_SCHEMA_REQUIRED", !fs.existsSync("supabase/migrations/20260912113000_relation_constructor_v1.sql"));

console.log(`PASS ${checks.length}/19`);
