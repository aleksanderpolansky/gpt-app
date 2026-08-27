import fs from "node:fs";

const shell = fs.readFileSync("src/components/app-shell/global-app-shell.tsx", "utf8");
const panel = fs.readFileSync("src/app/directory/[slug]/EnterprisePublicActivityPanel.tsx", "utf8");
const browser = fs.readFileSync("src/lib/media/browserPublicationImage.ts", "utf8");
const recovery = fs.readFileSync("docs/recovery/ARCTOR_MESSAGE_OBJECTS_F2M_PRODUCTION_CLOSURE_CLEANUP_V1_RU.md", "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check("DIAG_FILE_REMOVED", !fs.existsSync("src/components/app-shell/pixel-file-picker-lifecycle-diagnostic.tsx"));
check("DIAG_IMPORT_REMOVED", !shell.includes("PixelFilePickerLifecycleDiagnostic"));
check("PICKERDIAG_REMOVED", !shell.includes("pickerdiag"));
check("SHELL_DATA_ATTR_REMOVED", !shell.includes("data-arctor-app-shell"));
check("MAIN_DATA_ATTR_REMOVED", !shell.includes("data-arctor-main"));
check("VIEWPORT_VAR_REMOVED", !shell.includes("ARCTOR_APP_VIEWPORT_HEIGHT_CSS_VAR") && !shell.includes("--arctor-app-viewport-height"));
check("VISUAL_VIEWPORT_WORKAROUND_REMOVED", !shell.includes("window.visualViewport") && !shell.includes("scheduleMobileViewportSync"));
check("PAGESHOW_WORKAROUND_REMOVED", !shell.includes('window.addEventListener("pageshow", scheduleMobileViewportSync)'));
check("ROOT_H_SCREEN_RETAINED", shell.includes('className="flex h-screen w-screen flex-col overflow-hidden bg-[#f0f2f7]"'));
check("ROOT_FONT_STYLE_RETAINED", shell.includes("fontFamily: \"'Inter', system-ui, sans-serif\"") && !shell.includes("height: `var("));
check("MAIN_SCROLL_RETAINED", shell.includes('className="scrollbar-hide min-w-0 flex-1 overflow-y-auto bg-[#f0f2f7]"'));

check("FOCUS_FIX_BUTTON_REF", panel.includes("photoButtonRef"));
check("FOCUS_FIX_INPUT_REF", panel.includes("photoInputRef"));
check("FOCUS_FIX_PROGRAMMATIC_CLICK", panel.includes("input.click()"));
check("FOCUS_FIX_HIDDEN_INPUT", panel.includes('type="file"') && panel.includes("\n                hidden"));
check("FOCUS_FIX_TABINDEX", panel.includes("tabIndex={-1}"));
check("FOCUS_FIX_PREVENT_SCROLL", panel.includes("focus({ preventScroll: true })"));
check("OLD_SR_ONLY_TRIGGER_ABSENT", !panel.includes('className="sr-only"'));

check("MOBILE_DECODE_CREATE_IMAGE_BITMAP", browser.includes("await createImageBitmap"));
check("MOBILE_DECODE_RESIZE_WIDTH", browser.includes("resizeWidth: target.width"));
check("MOBILE_DECODE_MAX_EDGE_1600", browser.includes("PUBLICATION_IMAGE_MAX_EDGE_PX = 1600"));
check("MOBILE_DECODE_SOURCE_LIMIT", browser.includes("PUBLICATION_IMAGE_MAX_SOURCE_BYTES = 10 * 1024 * 1024"));
check("MOBILE_DECODE_HARD_LIMIT", browser.includes("PUBLICATION_IMAGE_MAX_BYTES = 512 * 1024"));

check("RECOVERY_ROOT_CAUSE", recovery.includes("main.top=-1452") && recovery.includes("activeElement=button"));
check("RECOVERY_PRODUCTION_MEDIA_PASS", recovery.includes("успешно выбрана, обработана, опубликована"));
check("RECOVERY_CONTINUATION", recovery.includes("F2M считать закрытым"));

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_MESSAGE_OBJECTS_F2M_PRODUCTION_CLOSURE_CLEANUP_V1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.allPass ? 0 : 1);
