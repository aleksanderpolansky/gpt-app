import fs from "node:fs";

const shell = fs.readFileSync("src/components/app-shell/global-app-shell.tsx", "utf8");
const diagnostic = fs.readFileSync("src/components/app-shell/pixel-file-picker-lifecycle-diagnostic.tsx", "utf8");
const recovery = fs.readFileSync("docs/recovery/ARCTOR_PIXEL_FILE_PICKER_LIFECYCLE_DIAGNOSTIC_V1_1_RU.md", "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check("SHELL_IMPORT", shell.includes("PixelFilePickerLifecycleDiagnostic"));
check("SHELL_ROOT_MARKER", shell.includes('data-arctor-app-shell="true"'));
check("SHELL_MAIN_MARKER", shell.includes('data-arctor-main="true"'));
check("SHELL_RENDER", shell.includes("<PixelFilePickerLifecycleDiagnostic />"));

check("QUERY_GATED", diagnostic.includes('const QUERY_PARAM = "pickerdiag"'));
check("SESSION_STORAGE", diagnostic.includes("window.sessionStorage"));
check("LOG_BOUND", diagnostic.includes("const MAX_RECORDS = 180"));
check("FILE_CLICK", diagnostic.includes('"file-input:click"'));
check("FILE_CANCEL", diagnostic.includes('"file-input:cancel"'));
check("FILE_CHANGE", diagnostic.includes('"file-input:change"'));
check("NO_FILE_NAME", !diagnostic.includes("file.name"));
check("FILE_TYPE_SIZE", diagnostic.includes("type: file.type") && diagnostic.includes("size: file.size"));

check("VISIBILITY", diagnostic.includes('"visibilitychange"'));
check("PAGESHOW", diagnostic.includes('"pageshow"') && diagnostic.includes("event.persisted"));
check("PAGEHIDE", diagnostic.includes('"pagehide"'));
check("FOCUS_BLUR", diagnostic.includes('"window:focus"') && diagnostic.includes('"window:blur"'));
check("POPSTATE", diagnostic.includes('"popstate"'));
check("VISUAL_VIEWPORT", diagnostic.includes('"visualViewport:resize"'));
check("ERROR_CAPTURE", diagnostic.includes('"window:error"'));
check("REJECTION_CAPTURE", diagnostic.includes('"window:unhandledrejection"'));
check("SNAPSHOT_DELAYS", diagnostic.includes("[0, 50, 250, 1000, 2000]"));
check("GEOMETRY", diagnostic.includes("getBoundingClientRect()"));
check("COMPUTED_STYLE", diagnostic.includes("window.getComputedStyle(element)"));
check("TEXT_LENGTH_ONLY", diagnostic.includes("textLength: element.textContent?.length ?? 0"));

check("NO_USE_STATE", !diagnostic.includes("useState"));
check("NO_SET_ENABLED", !diagnostic.includes("setEnabled("));
check("NO_SET_COPY_STATE", !diagnostic.includes("setCopyState("));
check("REF_GATE", diagnostic.includes('controlRef.current?.removeAttribute("hidden")'));
check("HIDDEN_DEFAULT", diagnostic.includes("ref={controlRef}") && diagnostic.includes("\n      hidden"));
check("COPY_REF", diagnostic.includes("copyButtonRef"));
check("COPY_DIAG", diagnostic.includes("Copy diag"));
check("RESET", diagnostic.includes("Reset"));

check("NO_FETCH", !diagnostic.includes("fetch("));
check("NO_RELOAD", !diagnostic.includes("location.reload"));
check("NO_ROUTER_REFRESH", !diagnostic.includes("router.refresh"));
check("NO_SUPABASE", !/supabase/i.test(diagnostic));
check("NO_STORAGE_API", !/\.storage\b/i.test(diagnostic));

check("RECOVERY_LINT", recovery.includes("react-hooks/set-state-in-effect"));
check("RECOVERY_ROLLBACK", recovery.includes("rollback"));
check("RECOVERY_V1_1", recovery.includes("V1_1"));

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_PIXEL_FILE_PICKER_LIFECYCLE_DIAGNOSTIC_V1_1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.allPass ? 0 : 1);
