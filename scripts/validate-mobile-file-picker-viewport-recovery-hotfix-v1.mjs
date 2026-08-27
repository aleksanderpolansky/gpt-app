import fs from "node:fs";

const shell = fs.readFileSync("src/components/app-shell/global-app-shell.tsx", "utf8");
const recovery = fs.readFileSync("docs/recovery/ARCTOR_MOBILE_FILE_PICKER_VIEWPORT_RECOVERY_HOTFIX_V1_RU.md", "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check(
  "CSS_VAR_DEFINED",
  shell.includes("--arctor-app-viewport-height"),
);
check(
  "VISUAL_VIEWPORT_HEIGHT",
  shell.includes("window.visualViewport?.height ?? window.innerHeight"),
);
check(
  "MOBILE_ONLY_QUERY",
  shell.includes('window.matchMedia("(max-width: 1023px)")'),
);
check(
  "INITIAL_SYNC",
  shell.includes("syncMobileViewportHeight();"),
);
check(
  "WINDOW_RESIZE",
  shell.includes('window.addEventListener("resize", scheduleMobileViewportSync)'),
);
check(
  "ORIENTATION_CHANGE",
  shell.includes('window.addEventListener("orientationchange", scheduleMobileViewportSync)'),
);
check(
  "PAGE_SHOW",
  shell.includes('window.addEventListener("pageshow", scheduleMobileViewportSync)'),
);
check(
  "VISIBILITY_CHANGE",
  shell.includes('"visibilitychange"') &&
    shell.includes('document.visibilityState === "visible"'),
);
check(
  "VISUAL_VIEWPORT_RESIZE",
  shell.includes("window.visualViewport?.addEventListener") &&
    shell.includes('"resize"'),
);
check(
  "DOUBLE_RAF",
  (shell.match(/window\.requestAnimationFrame/g) ?? []).length >= 2,
);
check(
  "INVALID_HEIGHT_GUARD",
  shell.includes("Number.isFinite(viewportHeight)") &&
    shell.includes("viewportHeight <= 0"),
);
check(
  "DESKTOP_VAR_REMOVAL",
  shell.includes("if (!mobileViewportQuery.matches)") &&
    shell.includes("removeProperty"),
);
check(
  "ROOT_H_SCREEN_FALLBACK_RETAINED",
  shell.includes('className="flex h-screen w-screen flex-col overflow-hidden'),
);
check(
  "ROOT_INLINE_VIEWPORT_HEIGHT",
  shell.includes("height: `var(${ARCTOR_APP_VIEWPORT_HEIGHT_CSS_VAR}, 100vh)`"),
);
check(
  "NO_ROUTER_REFRESH",
  !shell.includes("router.refresh()"),
);
check(
  "NO_LOCATION_RELOAD",
  !shell.includes("location.reload"),
);
check(
  "NO_FETCH",
  !shell.includes("fetch("),
);
check(
  "NO_DB_STORAGE",
  !/supabase|storage\.|\.from\(/i.test(shell),
);
check(
  "RECOVERY_CANCEL_REPRO",
  recovery.includes("НЕ выбирать файл") &&
    recovery.includes("белой основной областью"),
);
check(
  "RECOVERY_DECODE_EXCLUDED",
  recovery.includes("исключает image decode/resize"),
);
check(
  "RECOVERY_NO_RELOAD",
  recovery.includes("не делает `window.location.reload()`"),
);
check(
  "RECOVERY_NO_NETWORK",
  recovery.includes("не инициирует сетевые операции"),
);

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_MOBILE_FILE_PICKER_VIEWPORT_RECOVERY_HOTFIX_V1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.allPass ? 0 : 1);
