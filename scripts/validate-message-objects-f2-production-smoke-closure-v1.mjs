import fs from "node:fs";

const closurePath = "docs/recovery/ARCTOR_MESSAGE_OBJECTS_F2_PRODUCTION_SMOKE_CLOSURE_V1_RU.md";
const roadmapPath = "docs/recovery/ARCTOR_MESSAGE_OBJECTS_ROADMAP_CURRENT_20260826_RU.md";
const evidencePath = "docs/recovery/evidence/MESSAGE_OBJECTS/ARCTOR_MESSAGE_OBJECTS_F2_PRODUCTION_SMOKE_20260826.txt";

const closure = fs.readFileSync(closurePath, "utf8");
const roadmap = fs.readFileSync(roadmapPath, "utf8");
const evidence = fs.readFileSync(evidencePath, "utf8");

const checks = [];
const check = (name, condition) =>
  checks.push({ name, pass: Boolean(condition) });

check("CLOSURE_BASELINE", closure.includes("bc870d1f54adf39c543be2e4b9b787640c5d29fb"));
check("CLOSURE_PRODUCTION_PASS", closure.includes("production PASS"));
check("CLOSURE_GUEST_PUBLIC", closure.includes("Guest видит публикацию"));
check("CLOSURE_OWNER_ONLY", closure.includes("Guest не видит форму публикации"));
check("CLOSURE_EN_FINAL", closure.includes("ARCTor test publication"));
check("CLOSURE_CACHE_HIT", closure.includes("cache hit подтверждён"));
check("CLOSURE_FEED_PROJECTION", closure.includes("Feed — это read projection"));
check("CLOSURE_F4_NEXT", closure.includes("F4 Global ARCTor Feed"));

check("ROADMAP_F1_DONE", roadmap.includes("F1 — Message Objects Core — DONE"));
check("ROADMAP_F2_DONE", roadmap.includes("F2 — Native Enterprise Publication — DONE"));
check("ROADMAP_F2L_DONE", roadmap.includes("F2L — Updates / Multilingual Localization — DONE"));
check("ROADMAP_F3_DONE", roadmap.includes("F3 — Enterprise Updates Feed — BASE VERSION DONE"));
check("ROADMAP_F4_NEXT", roadmap.includes("F4 — Global ARCTor Feed — NEXT"));
check("ROADMAP_NO_PUBLICATION_CORE", roadmap.includes("Не возвращаться к отдельному `Publication Core`"));
check("ROADMAP_DISTRIBUTIONS", roadmap.includes("Каждая доставка = отдельный `message_object_distribution`"));

check("EVIDENCE_ORGANIZATION", evidence.includes("ORGANIZATION_ID=303c4744-7f37-47bd-b27d-d28d9a39e144"));
check("EVIDENCE_CACHE_PASS", evidence.includes("CACHE_RESULT=PASS"));
check("EVIDENCE_PUBLIC_PASS", evidence.includes("PUBLIC_READ_RESULT=PASS"));
check("EVIDENCE_OWNER_PASS", evidence.includes("OWNER_ONLY_COMPOSER_RESULT=PASS"));
check("EVIDENCE_TRANSLATION_PASS", evidence.includes("PER_BLOCK_TRANSLATION_FALLBACK_RESULT=PASS"));
check("EVIDENCE_LAYOUT_PASS", evidence.includes("LAYOUT_RESULT=PASS"));

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_MESSAGE_OBJECTS_F2_PRODUCTION_SMOKE_CLOSURE_V1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.allPass ? 0 : 1);
