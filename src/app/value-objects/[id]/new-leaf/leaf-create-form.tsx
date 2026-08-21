"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type ManualLeafKind = "activity_pattern" | "symptom";

type LeafCreateFormProps = {
  locale: LocaleCode;
  activeProfileName: string;
  parent: {
    id: string;
    title: string;
    branchTypeCode: string;
    objectKind: string;
    rootValueObjectId: string;
    status: string;
    facetCode: string;
    ontologyNodeRoleCode: "root" | "intermediate";
  };
};

type CreateLeafResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  redirectUrl?: string;
};

type Copy = {
  title: string;
  intro: string;
  back: string;
  profile: string;
  parent: string;
  facet: string;
  kind: string;
  activity: string;
  activityHelp: string;
  symptom: string;
  symptomHelp: string;
  mismatch: string;
  name: string;
  description: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  submit: string;
  busy: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: { title:"Add observation leaf", intro:"Activities and observations create numeric facts tagged by this leaf. The leaf itself is not rewritten after every event.", back:"Back to parent", profile:"Active profile", parent:"Parent", facet:"Parent facet", kind:"Observation kind", activity:"Activity / process", activityHelp:"Repeatable activity or process · PROCESS / activity_pattern", symptom:"Symptom", symptomHelp:"Symptom/state occurrence · STATE / symptom_state", mismatch:"This intermediate parent belongs to another semantic facet. Use a DOMAIN root or an intermediate node with a matching facet.", name:"Name", description:"Description", namePlaceholder:"For example: Neck pain", descriptionPlaceholder:"What exactly should be observed?", submit:"Create leaf", busy:"Creating…" },
  pl: { title:"Dodaj liściowy obiekt obserwacji", intro:"Aktywności i obserwacje tworzą fakty liczbowe oznaczone tym liściem. Sam liść nie jest przepisywany po każdym zdarzeniu.", back:"Wróć do rodzica", profile:"Aktywny profil", parent:"Rodzic", facet:"Aspekt rodzica", kind:"Rodzaj obserwacji", activity:"Aktywność / proces", activityHelp:"Powtarzalna aktywność lub proces · PROCESS / activity_pattern", symptom:"Objaw", symptomHelp:"Wystąpienie objawu/stanu · STATE / symptom_state", mismatch:"Ten rodzic pośredni należy do innej facety semantycznej. Użyj korzenia DOMAIN albo węzła pośredniego z odpowiednią facetą.", name:"Nazwa", description:"Opis", namePlaceholder:"Na przykład: Ból szyi", descriptionPlaceholder:"Co dokładnie ma być obserwowane?", submit:"Utwórz liść", busy:"Tworzenie…" },
  ru: { title:"Добавить листовой объект наблюдения", intro:"Активности и наблюдения создают числовые факты с тегом этого листа. Сам лист после каждого события не переписывается.", back:"К родителю", profile:"Активный профиль", parent:"Родитель", facet:"Грань родителя", kind:"Вид наблюдения", activity:"Активность / процесс", activityHelp:"Повторяемая активность или процесс · PROCESS / activity_pattern", symptom:"Симптом", symptomHelp:"Фиксация симптома/состояния · STATE / symptom_state", mismatch:"Этот промежуточный родитель относится к другой смысловой грани. Используй корневой DOMAIN-объект либо промежуточный узел подходящей грани.", name:"Название", description:"Описание", namePlaceholder:"Например: Боль в шее", descriptionPlaceholder:"Что именно мы наблюдаем?", submit:"Создать лист", busy:"Создаю…" },
  uk: { title:"Додати листовий об'єкт спостереження", intro:"Активності та спостереження створюють числові факти з тегом цього листа. Сам лист після кожної події не переписується.", back:"До батьківського об'єкта", profile:"Активний профіль", parent:"Батьківський об'єкт", facet:"Грань батька", kind:"Вид спостереження", activity:"Активність / процес", activityHelp:"Повторювана активність або процес · PROCESS / activity_pattern", symptom:"Симптом", symptomHelp:"Фіксація симптому/стану · STATE / symptom_state", mismatch:"Цей проміжний батько належить до іншої смислової грані. Використай корінь DOMAIN або проміжний вузол відповідної грані.", name:"Назва", description:"Опис", namePlaceholder:"Наприклад: Біль у шиї", descriptionPlaceholder:"Що саме ми спостерігаємо?", submit:"Створити лист", busy:"Створення…" },
  de: { title:"Beobachtungsblatt hinzufügen", intro:"Aktivitäten und Beobachtungen erzeugen numerische Fakten mit diesem Blatt als Tag. Das Blatt selbst wird nicht nach jedem Ereignis überschrieben.", back:"Zurück", profile:"Aktives Profil", parent:"Elternobjekt", facet:"Facet", kind:"Beobachtungsart", activity:"Aktivität / Prozess", activityHelp:"Wiederholbare Aktivität · PROCESS / activity_pattern", symptom:"Symptom", symptomHelp:"Symptom/Zustand · STATE / symptom_state", mismatch:"Die Facette des Zwischenobjekts passt nicht. Verwende eine DOMAIN-Wurzel oder einen passenden Zwischenknoten.", name:"Name", description:"Beschreibung", namePlaceholder:"Zum Beispiel: Nackenschmerz", descriptionPlaceholder:"Was soll beobachtet werden?", submit:"Blatt erstellen", busy:"Wird erstellt…" },
  es: { title:"Añadir hoja de observación", intro:"Las actividades y observaciones generan hechos numéricos etiquetados con esta hoja. La hoja no se reescribe después de cada evento.", back:"Volver", profile:"Perfil activo", parent:"Padre", facet:"Faceta", kind:"Tipo de observación", activity:"Actividad / proceso", activityHelp:"Actividad repetible · PROCESS / activity_pattern", symptom:"Síntoma", symptomHelp:"Síntoma/estado · STATE / symptom_state", mismatch:"La faceta del padre intermedio no coincide. Usa una raíz DOMAIN o un nodo intermedio adecuado.", name:"Nombre", description:"Descripción", namePlaceholder:"Por ejemplo: Dolor de cuello", descriptionPlaceholder:"¿Qué se debe observar?", submit:"Crear hoja", busy:"Creando…" },
  cs: { title:"Přidat listový objekt pozorování", intro:"Aktivity a pozorování vytvářejí číselná fakta označená tímto listem. List se po každé události nepřepisuje.", back:"Zpět", profile:"Aktivní profil", parent:"Rodič", facet:"Faceta", kind:"Druh pozorování", activity:"Aktivita / proces", activityHelp:"Opakovatelná aktivita · PROCESS / activity_pattern", symptom:"Příznak", symptomHelp:"Příznak/stav · STATE / symptom_state", mismatch:"Faceta mezilehlého rodiče neodpovídá. Použij kořen DOMAIN nebo vhodný mezilehlý uzel.", name:"Název", description:"Popis", namePlaceholder:"Například: Bolest krku", descriptionPlaceholder:"Co se má pozorovat?", submit:"Vytvořit list", busy:"Vytváření…" },
};

const FACET_BY_KIND: Record<ManualLeafKind, "PROCESS" | "STATE"> = {
  activity_pattern: "PROCESS",
  symptom: "STATE",
};

function localeHref(pathname: string, locale: LocaleCode) {
  return locale === "en" ? pathname : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

export function LeafCreateForm({ locale, activeProfileName, parent }: LeafCreateFormProps) {
  const router = useRouter();
  const copy = COPY[locale];
  const [kind, setKind] = useState<ManualLeafKind>("activity_pattern");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const availableKinds = useMemo(
    () => (["activity_pattern", "symptom"] as const).filter(
      (candidate) => parent.ontologyNodeRoleCode === "root" || parent.facetCode === FACET_BY_KIND[candidate],
    ),
    [parent.facetCode, parent.ontologyNodeRoleCode],
  );
  const selectedKind = availableKinds.includes(kind) ? kind : availableKinds[0] ?? null;

  async function submit() {
    if (!selectedKind) return;
    const normalizedTitle = title.trim();
    if (!normalizedTitle) { setError(copy.name); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/value-objects", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creationMode: "leaf_draft_v3",
          parentValueObjectId: parent.id,
          objectKind: selectedKind,
          title: normalizedTitle,
          description: description.trim() || undefined,
          locale,
        }),
      });
      const payload = (await response.json().catch(() => null)) as CreateLeafResponse | null;
      if (!response.ok || payload?.ok !== true || !payload.redirectUrl) {
        throw new Error(payload?.error || payload?.errorCode || `Leaf creation failed: ${response.status}`);
      }
      router.push(payload.redirectUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Leaf creation failed.");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-full bg-[#f5f6fb] p-5 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[920px] gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={localeHref(`/value-objects/${parent.id}`, locale)} className="rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a]">{copy.back}</Link>
          <span className="text-[12px] font-semibold text-[#7c8099]">{copy.profile}: {activeProfileName}</span>
        </div>
        <section className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-sm">
          <h1 className="text-[26px] font-bold text-[#111827]">{copy.title}</h1>
          <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#5a5f7a]">{copy.intro}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[[copy.parent,parent.title],[copy.facet,parent.facetCode],["role","leaf"]].map(([label,value]) => (
              <div key={label} className="rounded-2xl border border-[#e8eaf2] bg-[#fafbff] p-4"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">{label}</div><div className="mt-1 text-[13px] font-bold text-[#111827]">{value}</div></div>
            ))}
          </div>
          {availableKinds.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] leading-6 text-amber-900">{copy.mismatch}</div>
          ) : (
            <>
              <div className="mt-6"><div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7c8099]">{copy.kind}</div><div className="mt-2 grid gap-3 sm:grid-cols-2">
                {availableKinds.map((candidate) => {
                  const symptom = candidate === "symptom";
                  return <button key={candidate} type="button" onClick={() => setKind(candidate)} className={`rounded-2xl border p-4 text-left transition ${selectedKind===candidate?"border-[#3b6ef8] bg-[#eef2ff]":"border-[#e5e7eb] bg-white hover:border-[#c9d5ff]"}`}><div className="text-[14px] font-bold text-[#111827]">{symptom?copy.symptom:copy.activity}</div><div className="mt-1 text-[12px] leading-5 text-[#5a5f7a]">{symptom?copy.symptomHelp:copy.activityHelp}</div></button>;
                })}
              </div></div>
              <div className="mt-6 grid gap-4">
                <label className="text-[13px] font-bold text-[#343854]">{copy.name}<input value={title} onChange={(e)=>setTitle(e.target.value)} maxLength={180} placeholder={copy.namePlaceholder} className="mt-2 w-full rounded-xl border border-[#dfe3f1] px-4 py-3 text-[14px] outline-none focus:border-[#3b6ef8]" /></label>
                <label className="text-[13px] font-bold text-[#343854]">{copy.description}<textarea value={description} onChange={(e)=>setDescription(e.target.value)} maxLength={4000} rows={4} placeholder={copy.descriptionPlaceholder} className="mt-2 w-full resize-y rounded-xl border border-[#dfe3f1] px-4 py-3 text-[14px] outline-none focus:border-[#3b6ef8]" /></label>
              </div>
            </>
          )}
          {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] font-semibold text-red-800">{error}</div> : null}
          <button type="button" disabled={busy || !selectedKind} onClick={()=>void submit()} className="mt-6 w-full rounded-xl bg-[#3b6ef8] px-4 py-3 text-[14px] font-bold text-white disabled:opacity-50">{busy?copy.busy:copy.submit}</button>
        </section>
      </div>
    </main>
  );
}
