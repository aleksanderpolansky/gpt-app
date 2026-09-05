import fs from "node:fs";
import { argv, stdout } from "node:process";

function read(path) {
  return fs.readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
}
function assert(condition, label) {
  if (!condition) throw new Error(`VALIDATION_FAILED:${label}`);
}

const [templatePath, objectPath, workPath, catalogPath] = argv.slice(2);
const template = read(templatePath);
const object = read(objectPath);
const work = read(workPath);
const catalog = read(catalogPath);

for (const [name, source] of [["template", template], ["object", object]]) {
  for (const locale of ["PL", "UK", "DE", "ES", "CS"]) {
    assert(source.includes(`const ${locale}: Copy =`), `${name}_${locale}_copy_present`);
  }
  for (const alias of ["pl: EN", "uk: EN", "de: EN", "es: EN", "cs: EN"]) {
    assert(!source.includes(alias), `${name}_no_english_alias_${alias.slice(0, 2)}`);
  }
}

assert(
  template.includes("Для системной типовой активности должен быть определён хотя бы один измеримый параметр."),
  "ru_parameter_fact_wording",
);
assert(
  template.includes("Для системної типової активності має бути визначено щонайменше один вимірюваний параметр."),
  "uk_parameter_fact_wording",
);
assert(
  template.includes("Об’єкт спостереження для вимірювання ще не визначено"),
  "uk_mapping_pending_localized",
);
assert(!template.includes("{copy.currentParameter}: "), "duplicate_outer_parameter_context_removed");

assert(
  object.includes('"title":"Визначення об’єкта спостереження для вимірювання"'),
  "uk_object_title_localized",
);
assert(
  object.includes('"existing":"Відповідний листовий об’єкт знайдено"'),
  "uk_object_choice_localized",
);
assert(
  template.split("const DIMENSIONS = [").length - 1 === 1,
  "template_dimensions_anchor_exactly_once",
);
assert(
  object.split("const FACET_LABELS: Record<string, string> = {").length - 1 === 1,
  "object_facet_anchor_exactly_once",
);

assert(!work.includes("const parameterSummary = parameterCheck"), "stale_summary_variable_removed");
assert(!work.includes("{parameterSummary ? ("), "stale_summary_render_removed");
assert(
  work.includes("Перевірку системного каталогу параметрів завершено"),
  "uk_parameter_check_completion_precise",
);

assert(
  catalog.includes('locked:"Редактирование полей невозможно: параметр уже используется"'),
  "exact_ru_lock_wording",
);
assert(
  catalog.includes("border-amber-200 bg-amber-50 text-amber-800"),
  "lock_uses_amber_informational_style",
);
assert(!catalog.includes('locked:"Смысл заблокирован"'), "old_ru_lock_wording_removed");

stdout.write("ARCTOR_CURATOR_LOCALIZATION_AND_WORDING_CLEANUP_V1_0_2_VALIDATION: PASS\n");
