"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getActivityParameterPresentation,
  getActivityUnitLabel,
  type ActivityParameterLocale,
} from "@/lib/activity/activity-parameter-presentation";
import {
  getActivityAggregationLabel,
  getActivityDimensionLabel,
  getActivityParameterShowInactiveLabel,
  getActivityValueTypeLabel,
  getActivityWindowLabel,
  withTechnicalCode,
} from "@/lib/activity/activity-parameter-vocabulary";

type DefinitionItem = {
  id: string;
  parameterCode: string;
  title: string;
  description: string | null;
  dimensionCode: string;
  valueTypeCode: string;
  canonicalUnitCode: string;
  allowedUnitCodes: string[];
  aggregationMethodCode: string;
  defaultWindowCode: string;
  allowNegative: boolean;
  sourceVersion: string | null;
  status: "active" | "retired";
  usageCount: number;
  valueObjectAssignmentCount: number;
  activityTemplateUsageCount: number;
  semanticLocked: boolean;
  updatedAt: string;
};

type FormState = {
  title: string;
  description: string;
  dimensionCode: string;
  valueTypeCode: string;
  canonicalUnitCode: string;
  allowedUnitCodes: string;
  aggregationMethodCode: string;
  defaultWindowCode: string;
  allowNegative: boolean;
};

const DIMENSIONS = [
  "time", "distance", "count", "volume", "mass", "energy", "money", "rate",
  "score", "temperature", "text", "boolean", "timestamp", "pressure", "ratio",
  "sound_level", "illuminance",
] as const;
const VALUE_TYPES = ["numeric", "text", "boolean", "timestamp"] as const;
const AGGREGATIONS = ["sum", "average", "minimum", "maximum", "latest", "count", "duration", "rate", "none"] as const;
const WINDOWS = ["event", "hour", "day", "week", "month", "rolling_7_days", "rolling_30_days"] as const;

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  dimensionCode: "count",
  valueTypeCode: "numeric",
  canonicalUnitCode: "count",
  allowedUnitCodes: "count",
  aggregationMethodCode: "sum",
  defaultWindowCode: "event",
  allowNegative: false,
};

type Copy = {
  title: string;
  intro: string;
  create: string;
  search: string;
  active: string;
  retired: string;
  edit: string;
  noItems: string;
  technicalCode: string;
  generatedCode: string;
  usage: string;
  locked: string;
  unlocked: string;
  name: string;
  description: string;
  dimension: string;
  valueType: string;
  canonicalUnit: string;
  allowedUnits: string;
  aggregation: string;
  window: string;
  allowNegative: string;
  save: string;
  saving: string;
  cancel: string;
  deactivate: string;
  activate: string;
  semanticLockHelp: string;
  created: string;
  updated: string;
};

const COPY: Record<ActivityParameterLocale, Copy> = {
  en: { title:"Parameter catalog", intro:"System parameters used by observation objects and activity templates. Technical code is generated once and never changes.", create:"New parameter", search:"Search parameters…", active:"Active", retired:"Inactive", edit:"Edit", noItems:"No parameters found.", technicalCode:"Technical code", generatedCode:"Generated automatically after creation", usage:"Uses", locked:"Semantics locked", unlocked:"Editable", name:"Name", description:"Description", dimension:"Dimension", valueType:"Value type", canonicalUnit:"Canonical unit", allowedUnits:"Allowed units (comma-separated)", aggregation:"Aggregation", window:"Default window", allowNegative:"Allow negative values", save:"Save", saving:"Saving…", cancel:"Cancel", deactivate:"Deactivate", activate:"Activate", semanticLockHelp:"This parameter is already used. Its meaning cannot be rewritten; create a new parameter for different semantics. Activation status remains editable.", created:"Parameter created.", updated:"Parameter updated." },
  pl: { title:"Katalog parametrów", intro:"Parametry systemowe używane przez obiekty obserwacji i aktywności typowe. Kod techniczny powstaje raz i później się nie zmienia.", create:"Nowy parametr", search:"Szukaj parametrów…", active:"Aktywny", retired:"Nieaktywny", edit:"Edytuj", noItems:"Nie znaleziono parametrów.", technicalCode:"Kod techniczny", generatedCode:"Zostanie wygenerowany automatycznie po utworzeniu", usage:"Użycia", locked:"Semantyka zablokowana", unlocked:"Można edytować", name:"Nazwa", description:"Opis", dimension:"Wymiar", valueType:"Typ wartości", canonicalUnit:"Jednostka kanoniczna", allowedUnits:"Dozwolone jednostki (po przecinku)", aggregation:"Agregacja", window:"Domyślne okno", allowNegative:"Dopuść wartości ujemne", save:"Zapisz", saving:"Zapisywanie…", cancel:"Anuluj", deactivate:"Dezaktywuj", activate:"Aktywuj", semanticLockHelp:"Parametr jest już używany. Nie można przepisać jego znaczenia; dla innej semantyki utwórz nowy parametr. Status aktywności nadal można zmieniać.", created:"Utworzono parametr.", updated:"Zaktualizowano parametr." },
  ru: { title:"Каталог параметров", intro:"Системные параметры для объектов наблюдения и типовых активностей. Технический код создаётся один раз и затем не меняется.", create:"Новый параметр", search:"Поиск параметров…", active:"Активен", retired:"Неактивен", edit:"Изменить", noItems:"Параметры не найдены.", technicalCode:"Технический код", generatedCode:"Будет создан автоматически после сохранения", usage:"Использований", locked:"Смысл заблокирован", unlocked:"Можно редактировать", name:"Название", description:"Описание", dimension:"Размерность", valueType:"Тип значения", canonicalUnit:"Каноническая единица", allowedUnits:"Допустимые единицы (через запятую)", aggregation:"Агрегация", window:"Окно по умолчанию", allowNegative:"Разрешить отрицательные значения", save:"Сохранить", saving:"Сохраняю…", cancel:"Отмена", deactivate:"Деактивировать", activate:"Активировать", semanticLockHelp:"Параметр уже используется. Его смысловые поля нельзя переписывать; для нового смысла создайте новый параметр. Статус активности менять можно.", created:"Параметр создан.", updated:"Параметр обновлён." },
  uk: { title:"Каталог параметрів", intro:"Системні параметри для об’єктів спостереження й типових активностей. Технічний код створюється один раз і далі не змінюється.", create:"Новий параметр", search:"Пошук параметрів…", active:"Активний", retired:"Неактивний", edit:"Змінити", noItems:"Параметрів не знайдено.", technicalCode:"Технічний код", generatedCode:"Буде створено автоматично після збереження", usage:"Використань", locked:"Семантика заблокована", unlocked:"Можна редагувати", name:"Назва", description:"Опис", dimension:"Вимір", valueType:"Тип значення", canonicalUnit:"Канонічна одиниця", allowedUnits:"Допустимі одиниці (через кому)", aggregation:"Агрегація", window:"Типове вікно", allowNegative:"Дозволити від’ємні значення", save:"Зберегти", saving:"Зберігаю…", cancel:"Скасувати", deactivate:"Деактивувати", activate:"Активувати", semanticLockHelp:"Параметр уже використовується. Його смислові поля не можна переписувати; для іншого змісту створіть новий параметр. Статус активності можна змінювати.", created:"Параметр створено.", updated:"Параметр оновлено." },
  de: { title:"Parameterkatalog", intro:"Systemparameter für Beobachtungsobjekte und typische Aktivitäten. Der technische Code wird einmal erzeugt und bleibt danach unveränderlich.", create:"Neuer Parameter", search:"Parameter suchen…", active:"Aktiv", retired:"Inaktiv", edit:"Bearbeiten", noItems:"Keine Parameter gefunden.", technicalCode:"Technischer Code", generatedCode:"Wird beim Erstellen automatisch erzeugt", usage:"Verwendungen", locked:"Semantik gesperrt", unlocked:"Bearbeitbar", name:"Name", description:"Beschreibung", dimension:"Dimension", valueType:"Werttyp", canonicalUnit:"Kanonische Einheit", allowedUnits:"Zulässige Einheiten (Komma-getrennt)", aggregation:"Aggregation", window:"Standardfenster", allowNegative:"Negative Werte erlauben", save:"Speichern", saving:"Speichern…", cancel:"Abbrechen", deactivate:"Deaktivieren", activate:"Aktivieren", semanticLockHelp:"Dieser Parameter wird bereits verwendet. Seine Semantik darf nicht überschrieben werden; für eine andere Bedeutung bitte einen neuen Parameter anlegen. Der Aktivstatus bleibt änderbar.", created:"Parameter erstellt.", updated:"Parameter aktualisiert." },
  es: { title:"Catálogo de parámetros", intro:"Parámetros del sistema para objetos de observación y actividades típicas. El código técnico se genera una vez y no cambia después.", create:"Nuevo parámetro", search:"Buscar parámetros…", active:"Activo", retired:"Inactivo", edit:"Editar", noItems:"No se encontraron parámetros.", technicalCode:"Código técnico", generatedCode:"Se generará automáticamente al crear", usage:"Usos", locked:"Semántica bloqueada", unlocked:"Editable", name:"Nombre", description:"Descripción", dimension:"Dimensión", valueType:"Tipo de valor", canonicalUnit:"Unidad canónica", allowedUnits:"Unidades permitidas (separadas por comas)", aggregation:"Agregación", window:"Ventana predeterminada", allowNegative:"Permitir valores negativos", save:"Guardar", saving:"Guardando…", cancel:"Cancelar", deactivate:"Desactivar", activate:"Activar", semanticLockHelp:"Este parámetro ya se utiliza. No se puede reescribir su semántica; cree un parámetro nuevo para otro significado. El estado de activación sí puede cambiarse.", created:"Parámetro creado.", updated:"Parámetro actualizado." },
  cs: { title:"Katalog parametrů", intro:"Systémové parametry pro objekty pozorování a typické aktivity. Technický kód se vytvoří jednou a potom se nemění.", create:"Nový parametr", search:"Hledat parametry…", active:"Aktivní", retired:"Neaktivní", edit:"Upravit", noItems:"Nebyly nalezeny žádné parametry.", technicalCode:"Technický kód", generatedCode:"Vygeneruje se automaticky při vytvoření", usage:"Použití", locked:"Sémantika uzamčena", unlocked:"Lze upravit", name:"Název", description:"Popis", dimension:"Rozměr", valueType:"Typ hodnoty", canonicalUnit:"Kanonická jednotka", allowedUnits:"Povolené jednotky (oddělené čárkou)", aggregation:"Agregace", window:"Výchozí okno", allowNegative:"Povolit záporné hodnoty", save:"Uložit", saving:"Ukládání…", cancel:"Zrušit", deactivate:"Deaktivovat", activate:"Aktivovat", semanticLockHelp:"Parametr se již používá. Jeho sémantiku nelze přepsat; pro jiný význam vytvořte nový parametr. Stav aktivace lze stále měnit.", created:"Parametr vytvořen.", updated:"Parametr aktualizován." },
};

export function ActivityParameterAdminCatalog({ locale }: { locale: ActivityParameterLocale }) {
  const copy = COPY[locale] ?? COPY.en;
  const [definitions, setDefinitions] = useState<DefinitionItem[]>([]);
  const [search, setSearch] = useState("");
  const [showRetired, setShowRetired] = useState(false);
  const [editing, setEditing] = useState<DefinitionItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/activity-parameter-definitions", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || payload?.ok !== true) {
      throw new Error(payload?.error || payload?.errorMessage || "Parameter catalog load failed");
    }
    setDefinitions(payload.definitions ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Parameter catalog load failed",
        );
      }
    })();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return definitions.filter((item) => {
      if (!showRetired && item.status !== "active") return false;
      if (!query) return true;
      const presentation = getActivityParameterPresentation(item.parameterCode, locale, item.title, item.description);
      const dimensionLabel = getActivityDimensionLabel(item.dimensionCode, locale);
      return [presentation.title, item.title, item.parameterCode, dimensionLabel, item.dimensionCode, item.canonicalUnitCode]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    });
  }, [definitions, locale, search, showRetired]);

  function beginCreate() {
    setEditing(null);
    setCreating(true);
    setForm(EMPTY_FORM);
    setError("");
    setMessage("");
  }

  function beginEdit(item: DefinitionItem) {
    setCreating(false);
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description ?? "",
      dimensionCode: item.dimensionCode,
      valueTypeCode: item.valueTypeCode,
      canonicalUnitCode: item.canonicalUnitCode,
      allowedUnitCodes: item.allowedUnitCodes.join(", "),
      aggregationMethodCode: item.aggregationMethodCode,
      defaultWindowCode: item.defaultWindowCode,
      allowNegative: item.allowNegative,
    });
    setError("");
    setMessage("");
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function semanticBody() {
    return {
      title: form.title,
      description: form.description,
      dimensionCode: form.dimensionCode,
      valueTypeCode: form.valueTypeCode,
      canonicalUnitCode: form.canonicalUnitCode,
      allowedUnitCodes: form.allowedUnitCodes.split(/[\s,;]+/u).map((value) => value.trim()).filter(Boolean),
      aggregationMethodCode: form.aggregationMethodCode,
      defaultWindowCode: form.defaultWindowCode,
      allowNegative: form.allowNegative,
    };
  }

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/activity-parameter-definitions", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, parameterCode: editing.parameterCode, status: editing.status, ...semanticBody() } : semanticBody()),
      });
      const payload = await response.json();
      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || payload?.errorMessage || "Save failed");
      }
      await load();
      window.dispatchEvent(new CustomEvent("arctor:activity-parameter-catalog-changed"));
      setMessage(editing ? copy.updated : copy.created);
      closeForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(item: DefinitionItem) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/activity-parameter-definitions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, parameterCode: item.parameterCode, status: item.status === "active" ? "retired" : "active" }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || payload?.errorMessage || "Status update failed");
      }
      await load();
      window.dispatchEvent(new CustomEvent("arctor:activity-parameter-catalog-changed"));
      setMessage(copy.updated);
      if (editing?.id === item.id) closeForm();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  const formVisible = creating || editing !== null;
  const semanticLocked = editing?.semanticLocked === true;

  return (
    <section className="rounded-[20px] border border-black/[0.07] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-[#1a1d2e]">{copy.title}</h2>
          <p className="mt-1 max-w-3xl text-[11px] leading-4 text-slate-500">{copy.intro}</p>
        </div>
        <button type="button" onClick={beginCreate} className="rounded-xl bg-[#3b6ef8] px-3 py-2 text-xs font-bold text-white">
          + {copy.create}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#3b6ef8]" />
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
          <input type="checkbox" checked={showRetired} onChange={(event) => setShowRetired(event.target.checked)} />
          <span>{getActivityParameterShowInactiveLabel(locale)}</span>
        </label>
      </div>

      {error ? <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
      {message ? <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">{message}</div> : null}

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {filtered.length === 0 ? <p className="text-xs text-slate-500">{copy.noItems}</p> : filtered.map((item) => {
          const presentation = getActivityParameterPresentation(item.parameterCode, locale, item.title, item.description);
          return (
            <article key={item.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-[13px] font-semibold">{presentation.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.status === "active" ? copy.active : copy.retired}</span>
                  </div>
                  <p className="mt-1 break-all font-mono text-[10px] text-slate-400">{item.parameterCode}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{getActivityUnitLabel(item.canonicalUnitCode, locale)} · {getActivityDimensionLabel(item.dimensionCode, locale)} · {copy.usage}: {item.usageCount}</p>
                  <p className={`mt-1 text-[10px] font-semibold ${item.semanticLocked ? "text-amber-700" : "text-slate-400"}`}>{item.semanticLocked ? copy.locked : copy.unlocked}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button type="button" onClick={() => beginEdit(item)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-600">{copy.edit}</button>
                  <button type="button" disabled={busy} onClick={() => void toggleStatus(item)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-600 disabled:opacity-50">{item.status === "active" ? copy.deactivate : copy.activate}</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {formVisible ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="text-xs font-medium">{copy.name}</span><input value={form.title} disabled={semanticLocked} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" /></label>
            <label className="block sm:col-span-2"><span className="text-xs font-medium">{copy.description}</span><textarea rows={2} value={form.description} disabled={semanticLocked} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" /></label>
            <div className="sm:col-span-2"><p className="text-xs font-medium">{copy.technicalCode}</p><p className="mt-1 rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">{editing?.parameterCode ?? copy.generatedCode}</p></div>
            <label className="block"><span className="text-xs font-medium">{copy.dimension}</span><select value={form.dimensionCode} disabled={semanticLocked} onChange={(event) => setForm((current) => ({ ...current, dimensionCode: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50">{DIMENSIONS.map((code) => <option key={code} value={code}>{withTechnicalCode(getActivityDimensionLabel(code, locale), code)}</option>)}</select></label>
            <label className="block"><span className="text-xs font-medium">{copy.valueType}</span><select value={form.valueTypeCode} disabled={semanticLocked} onChange={(event) => setForm((current) => ({ ...current, valueTypeCode: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50">{VALUE_TYPES.map((code) => <option key={code} value={code}>{withTechnicalCode(getActivityValueTypeLabel(code, locale), code)}</option>)}</select></label>
            <label className="block"><span className="text-xs font-medium">{copy.canonicalUnit}</span><input value={form.canonicalUnitCode} disabled={semanticLocked} onChange={(event) => setForm((current) => ({ ...current, canonicalUnitCode: event.target.value.toLowerCase() }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm disabled:bg-slate-50" /></label>
            <label className="block"><span className="text-xs font-medium">{copy.allowedUnits}</span><input value={form.allowedUnitCodes} disabled={semanticLocked} onChange={(event) => setForm((current) => ({ ...current, allowedUnitCodes: event.target.value.toLowerCase() }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm disabled:bg-slate-50" /></label>
            <label className="block"><span className="text-xs font-medium">{copy.aggregation}</span><select value={form.aggregationMethodCode} disabled={semanticLocked} onChange={(event) => setForm((current) => ({ ...current, aggregationMethodCode: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50">{AGGREGATIONS.map((code) => <option key={code} value={code}>{withTechnicalCode(getActivityAggregationLabel(code, locale), code)}</option>)}</select></label>
            <label className="block"><span className="text-xs font-medium">{copy.window}</span><select value={form.defaultWindowCode} disabled={semanticLocked} onChange={(event) => setForm((current) => ({ ...current, defaultWindowCode: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50">{WINDOWS.map((code) => <option key={code} value={code}>{withTechnicalCode(getActivityWindowLabel(code, locale), code)}</option>)}</select></label>
            <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={form.allowNegative} disabled={semanticLocked} onChange={(event) => setForm((current) => ({ ...current, allowNegative: event.target.checked }))} /><span className="text-xs font-medium">{copy.allowNegative}</span></label>
          </div>
          {semanticLocked ? <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{copy.semanticLockHelp}</div> : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">{copy.cancel}</button><button type="button" disabled={busy || semanticLocked} onClick={() => void save()} className="rounded-xl bg-[#3b6ef8] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? copy.saving : copy.save}</button></div>
        </div>
      ) : null}
    </section>
  );
}
