import fs from "node:fs";

const panel = fs.readFileSync("src/app/directory/[slug]/EnterprisePublicActivityPanel.tsx", "utf8");
const recovery = fs.readFileSync("docs/recovery/ARCTOR_PIXEL_FILE_PICKER_FOCUS_SCROLL_HOTFIX_V1_RU.md", "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check("PHOTO_BUTTON_REF", panel.includes("photoButtonRef"));
check("PHOTO_INPUT_REF", panel.includes("photoInputRef"));
check("VISIBLE_BUTTON", panel.includes('type="button"') && panel.includes("onClick={openImagePicker}"));
check("PROGRAMMATIC_INPUT_CLICK", panel.includes("input.click()"));
check("HIDDEN_INPUT", panel.includes('type="file"') && panel.includes("\n                hidden"));
check("TAB_INDEX_MINUS_ONE", panel.includes("tabIndex={-1}"));
check("STOP_PROPAGATION", panel.includes("event.stopPropagation()"));
check("PREVENT_SCROLL_FOCUS", panel.includes("focus({ preventScroll: true })"));
check("NO_SR_ONLY_FILE_INPUT", !panel.includes('className="sr-only"'));
check("NO_LABEL_FILE_TRIGGER", !/<label[\s\S]{0,1200}type="file"/.test(panel));

check("ACCEPT_TYPES_RETAINED", panel.includes('accept="image/jpeg,image/png,image/webp"'));
check("SELECT_IMAGE_RETAINED", panel.includes("void selectImage(file)"));
check("FORMDATA_RETAINED", panel.includes("new FormData()"));
check("IMAGE_BLOB_RETAINED", panel.includes('formData.set("image", image.blob'));
check("ARCTOR_STYLE", panel.includes("#3b6ef8") && panel.includes("#dfe3f1"));

check("NO_RELOAD", !panel.includes("location.reload"));
check("NO_ROUTER_PUSH", !panel.includes("router.push("));
check("NO_DDL", !/create table|alter table|drop table/i.test(panel));

check("RECOVERY_RECT_EVIDENCE", recovery.includes("top=-1452") && recovery.includes("main scrollTop не изменился"));
check("RECOVERY_PRE_PICKER", recovery.includes("ДО picker return"));
check("RECOVERY_ROOT_CAUSE", recovery.includes("label + `sr-only`"));
check("RECOVERY_DIAGNOSTIC_RETAINED", recovery.includes("Diagnostic V1_1 пока остаётся"));

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_PIXEL_FILE_PICKER_FOCUS_SCROLL_HOTFIX_V1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.allPass ? 0 : 1);
