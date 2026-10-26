"use client";
import {useEffect,useMemo,useRef,useState,type FormEvent} from "react";
import { ParentObservationObjectCombobox } from "./parent-observation-object-combobox";
import {readHandoffForForm} from "@/lib/ontology-research/proposalHandoffV5";

type Locale="ru"|"uk"|"pl"|"en"|"de"|"es"|"cs";
type Role="root"|"intermediate"|"leaf";
type Parent={id:string;title:string;role:string;parentId:string|null};
const EMPTY_PARENTS:Parent[]=[];
const LOCALES:Locale[]=["ru","uk","pl","en","de","es","cs"];
const LANG_NAMES:Record<Locale,string>={ru:"Русский",uk:"Українська",pl:"Polski",en:"English",de:"Deutsch",es:"Español",cs:"Čeština"};
type Copy={heading:string;intro:string;role:string;root:string;intermediate:string;leaf:string;parent:string;pick:string;rel:string;localTitle:string;localDescription:string;englishTitle:string;englishDescription:string;reason:string;submit:string;saving:string;created:string;none:string;pending:string;blocked:string;rolesNotice:string;open:string;loadError:string;required:string;newNext:string};
const COPY:Record<Locale,Copy>={
ru:{heading:"Создать системный ОН",intro:"Только для администраторов платформы. Корневой объект не имеет родителя; промежуточный создаётся под корневым или промежуточным; листовой — только под промежуточным.",role:"Структурная роль",root:"Корневой",intermediate:"Промежуточный",leaf:"Листовой",parent:"Родительский системный ОН",pick:"Выберите родителя",rel:"Связь с родителем",localTitle:"Название на языке ввода",localDescription:"Определение на языке ввода",englishTitle:"Каноническое английское название",englishDescription:"Каноническое английское определение",reason:"Обоснование создания",submit:"Создать системный ОН",saving:"Создание…",created:"Системный ОН создан",none:"Родителей для этой роли пока нет",pending:"Переводы остальных языков ожидают отдельного разрешения",blocked:"Другие локализации заблокированы до ручного согласования; ИИ не вызван",rolesNotice:"Доступ к созданию пока имеют только owner/admin платформы. Права должности «Главный куратор модели» подключим после отдельного назначения.",open:"Открыть объект",loadError:"Не удалось загрузить системные родительские ОН",required:"Заполните все обязательные поля и выберите родителя",newNext:"Создать следующий объект"},
uk:{heading:"Створити системний ОН",intro:"Лише для адміністраторів платформи. Кореневий об’єкт не має батьківського; проміжний створюється під кореневим або проміжним; листовий — лише під проміжним.",role:"Структурна роль",root:"Кореневий",intermediate:"Проміжний",leaf:"Листовий",parent:"Батьківський системний ОН",pick:"Оберіть батьківський об’єкт",rel:"Зв’язок із батьківським",localTitle:"Назва мовою введення",localDescription:"Визначення мовою введення",englishTitle:"Канонічна англійська назва",englishDescription:"Канонічне англійське визначення",reason:"Обґрунтування створення",submit:"Створити системний ОН",saving:"Створення…",created:"Системний ОН створено",none:"Немає доступних батьківських об’єктів",pending:"Переклади інших мов потребують окремого дозволу",blocked:"Інші локалізації заблоковано до ручного погодження; ШІ не викликано",rolesNotice:"Наразі створення доступне лише власнику або адміністратору платформи. Призначення ролі головного куратора — окремий етап.",open:"Відкрити об’єкт",loadError:"Не вдалося завантажити системні об’єкти",required:"Заповніть обов’язкові поля",newNext:"Створити наступний"},
pl:{heading:"Utwórz systemowy obiekt obserwacji",intro:"Tylko dla administratorów platformy. Obiekt główny nie ma rodzica; pośredni może mieć rodzica głównego lub pośredniego; liść tylko pośredniego.",role:"Rola strukturalna",root:"Główny",intermediate:"Pośredni",leaf:"Liść",parent:"Nadrzędny obiekt systemowy",pick:"Wybierz obiekt nadrzędny",rel:"Relacja z obiektem nadrzędnym",localTitle:"Nazwa w wybranym języku",localDescription:"Definicja w wybranym języku",englishTitle:"Kanoniczna nazwa angielska",englishDescription:"Kanoniczna definicja angielska",reason:"Uzasadnienie utworzenia",submit:"Utwórz systemowy obiekt",saving:"Tworzenie…",created:"Utworzono obiekt systemowy",none:"Brak dostępnych obiektów nadrzędnych",pending:"Pozostałe tłumaczenia wymagają osobnej zgody",blocked:"Pozostałe lokalizacje oczekują na ręczne zatwierdzenie; AI nie zostało wywołane",rolesNotice:"Obecnie tworzenie wymaga roli owner/admin platformy. Przydział uprawnień głównemu kuratorowi to osobny etap.",open:"Otwórz obiekt",loadError:"Nie udało się pobrać obiektów",required:"Uzupełnij wymagane pola",newNext:"Utwórz kolejny"},
en:{heading:"Create system observation object",intro:"Platform administrators only. Roots have no parent; intermediate nodes require root/intermediate parents; leaves require intermediate parents.",role:"Structural role",root:"Root",intermediate:"Intermediate",leaf:"Leaf",parent:"Parent system object",pick:"Choose parent",rel:"Parent relation",localTitle:"Title in input language",localDescription:"Definition in input language",englishTitle:"Canonical English title",englishDescription:"Canonical English definition",reason:"Creation justification",submit:"Create system object",saving:"Creating…",created:"System object created",none:"No eligible parent objects",pending:"Other translations require separate authorization",blocked:"Other locales remain blocked until manual approval; no AI called",rolesNotice:"Only platform owner/admin can currently create. Assignment of Chief Model Curator privileges is a separate phase.",open:"Open object",loadError:"Could not load system parent objects",required:"Please fill required fields",newNext:"Create another"},
de:{heading:"Systemisches Beobachtungsobjekt erstellen",intro:"Nur für Plattformadministratoren. Wurzeln haben keinen Elternknoten; Zwischenknoten benötigen Wurzel-/Zwischenknoten; Blätter einen Zwischenknoten.",role:"Strukturelle Rolle",root:"Wurzel",intermediate:"Zwischenknoten",leaf:"Blatt",parent:"Übergeordnetes Systemobjekt",pick:"Elternobjekt wählen",rel:"Beziehung zum Elternobjekt",localTitle:"Name in Eingabesprache",localDescription:"Definition in Eingabesprache",englishTitle:"Kanonischer englischer Name",englishDescription:"Kanonische englische Definition",reason:"Begründung",submit:"Systemobjekt erstellen",saving:"Wird erstellt…",created:"Systemobjekt erstellt",none:"Keine passenden Elternobjekte",pending:"Andere Übersetzungen erfordern eine separate Freigabe",blocked:"Weitere Sprachen bis zur manuellen Freigabe gesperrt; keine KI-Anfrage",rolesNotice:"Derzeit können nur Plattform-Owner/Admin erstellen. Die Freigabe für den Chefkurator folgt separat.",open:"Objekt öffnen",loadError:"Systemobjekte konnten nicht geladen werden",required:"Bitte Pflichtfelder ausfüllen",newNext:"Weiteres erstellen"},
es:{heading:"Crear objeto de observación del sistema",intro:"Solo para administradores. Los objetos raíz no tienen padre; los intermedios requieren raíz/intermedio; los objetos hoja requieren intermedio.",role:"Rol estructural",root:"Raíz",intermediate:"Intermedio",leaf:"Hoja",parent:"Objeto del sistema padre",pick:"Elija el padre",rel:"Relación con el padre",localTitle:"Título en el idioma elegido",localDescription:"Definición en el idioma elegido",englishTitle:"Título canónico en inglés",englishDescription:"Definición canónica en inglés",reason:"Justificación",submit:"Crear objeto del sistema",saving:"Creando…",created:"Objeto del sistema creado",none:"No hay padres disponibles",pending:"Otras traducciones necesitan autorización",blocked:"Otros idiomas bloqueados hasta aprobación manual; sin llamadas a IA",rolesNotice:"Actualmente solo los administradores owner/admin pueden crear. La autorización del curador principal será una etapa aparte.",open:"Abrir objeto",loadError:"No se pudieron cargar objetos padre",required:"Complete los campos requeridos",newNext:"Crear otro"},
cs:{heading:"Vytvořit systémový objekt pozorování",intro:"Pouze správci platformy. Kořeny nemají rodiče; mezilehlé objekty vyžadují kořen nebo mezilehlý; listové vyžadují mezilehlý.",role:"Strukturální role",root:"Kořen",intermediate:"Mezilehlý",leaf:"List",parent:"Nadřazený systémový objekt",pick:"Vyberte nadřazený objekt",rel:"Vztah k rodiči",localTitle:"Název ve zvoleném jazyce",localDescription:"Definice ve zvoleném jazyce",englishTitle:"Kanonický anglický název",englishDescription:"Kanonická anglická definice",reason:"Odůvodnění",submit:"Vytvořit systémový objekt",saving:"Vytváření…",created:"Systémový objekt vytvořen",none:"Žádné vhodné nadřazené objekty",pending:"Ostatní překlady vyžadují samostatné schválení",blocked:"Další jazyky čekají na ruční schválení; AI nebyla volána",rolesNotice:"Zatím mohou vytvářet jen owner/admin. Oprávnění hlavního kurátora modelu bude samostatná fáze.",open:"Otevřít objekt",loadError:"Nelze načíst systémové objekty",required:"Vyplňte povinná pole",newNext:"Vytvořit další"}
};
const OPTIONS=[{value:"part_of",text:"part_of"},{value:"is_a",text:"is_a"},{value:"aspect_of",text:"aspect_of"},{value:"subprocess_of",text:"subprocess_of"}];
const inputClass="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500";
export function SystemObservationObjectAdminForm({initialLocale,initialParentId}:{initialLocale:string;initialParentId:string}) {
  const [locale,setLocale]=useState<Locale>(LOCALES.includes(initialLocale as Locale)?initialLocale as Locale:"ru");
  const [role,setRole]=useState<Role>("leaf");
  const [parentResult,setParentResult]=useState<{locale:Locale;parents:Parent[]} | null>(null);
  const [parent,setParent]=useState(initialParentId);
  const [relation,setRelation]=useState("part_of");
  const [localizedTitle,setLocalizedTitle]=useState("");const [localizedDescription,setLocalizedDescription]=useState("");
  const [titleEn,setTitleEn]=useState("");const [descriptionEn,setDescriptionEn]=useState("");
  const [reason,setReason]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");const [created,setCreated]=useState<{id:string;key:string}|null>(null);
  const requestIdRef=useRef<string|null>(null);
  const [handoffNotice,setHandoffNotice]=useState("");
  const handoffReadRef=useRef(false);
  useEffect(()=>{
    if(handoffReadRef.current)return;
    handoffReadRef.current=true;
    // Read a same-tab, short-lived draft. The URL contains only a random token, never form content.
    const token=new URLSearchParams(window.location.search).get("handoff");
    if(!token)return;
    Promise.resolve().then(()=>{
      const found=readHandoffForForm(window.sessionStorage,token);
      if(!found.ok){setHandoffNotice(found.error);return;}
      const d=found.draft;
      setLocale("ru");setRole(d.role);setParent(d.parentExistingId??"");setRelation(d.relationCode);
      setLocalizedTitle(d.titleRu);setLocalizedDescription(d.definitionRu);
      setTitleEn(d.titleEn);setDescriptionEn(d.definitionEn);setReason(d.rationale);
      setHandoffNotice("ONTO-AI: проект загружен. Проверьте все поля и только затем вручную подтвердите создание.");
    });
  },[]);
  const copy=COPY[locale];
  const loading=parentResult?.locale!==locale;
  const parents=!loading&&parentResult?parentResult.parents:EMPTY_PARENTS;
  useEffect(()=>{
    const controller=new AbortController();
    fetch(`/api/admin/system-observation-objects?locale=${locale}`,{cache:"no-store",signal:controller.signal})
      .then(async r=>{const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.errorCode??"PARENT_LOAD_FAILED");return j as {parents:Parent[]};})
      .then(j=>{if(!controller.signal.aborted){setParentResult({locale,parents:j.parents});setError("");}})
      .catch(e=>{if(!controller.signal.aborted){setParentResult({locale,parents:[]});setError(e instanceof Error?e.message:"PARENT_LOAD_FAILED");}});
    return ()=>controller.abort();
  },[locale]);
  const options=useMemo(()=>parents.filter(p=>role==="leaf"?p.role==="intermediate":p.role==="root"||p.role==="intermediate"),[parents,role]);
  const eligibleParent=options.some(p=>p.id===parent)?parent:"";
  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();if(busy)return;
    if(loading||!reason.trim()||(role!=="root"&&!eligibleParent)){setError(copy.required);return;}
    const requestId=requestIdRef.current??(requestIdRef.current=crypto.randomUUID());
    setError("");setBusy(true);setCreated(null);
    try {
      const response=await fetch("/api/admin/system-observation-objects",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        locale,nodeRole:role,parentId:role==="root"?null:eligibleParent,relationCode:role==="root"?null:relation,
        localizedTitle:locale==="en"?titleEn:localizedTitle,
        localizedDescription:locale==="en"?descriptionEn:localizedDescription,
        titleEn,descriptionEn,comment:reason,creationRequestId:requestId
      })});
      const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.errorCode??"CREATE_FAILED");
      setCreated({id:result.id,key:result.canonicalKey});
    }catch(e){setError(e instanceof Error?e.message:"CREATE_FAILED");}
    finally{setBusy(false);}
  };
  return <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm sm:p-8">
    <h1 className="text-2xl font-bold">{copy.heading}</h1><p className="mt-2 text-sm text-slate-600">{copy.intro}</p>
    <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{copy.rolesNotice}</div>
    {handoffNotice&&<div role="status" className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{handoffNotice}</div>}
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Language / Мова / Język
          <select className={inputClass} value={locale} onChange={e=>setLocale(e.target.value as Locale)}>{LOCALES.map(code=><option value={code} key={code}>{LANG_NAMES[code]}</option>)}</select>
        </label>
        <label className="text-sm font-semibold">{copy.role}
          <select className={inputClass} value={role} onChange={e=>{setRole(e.target.value as Role);setParent("");}}>
            <option value="root">{copy.root}</option><option value="intermediate">{copy.intermediate}</option><option value="leaf">{copy.leaf}</option>
          </select>
        </label>
      </div>
      {role!=="root"&&<div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="arctor-admin-system-on-parent-search" className="text-sm font-semibold">{copy.parent}</label>
          <ParentObservationObjectCombobox
            inputId="arctor-admin-system-on-parent-search"
            locale={locale}
            options={options}
            selectedId={eligibleParent}
            onSelect={setParent}
            disabled={busy}
            loading={loading}
          />
        </div>
        <label className="text-sm font-semibold">{copy.rel}
          <select className={inputClass} value={relation} onChange={e=>setRelation(e.target.value)}>{OPTIONS.map(o=><option value={o.value} key={o.value}>{o.text}</option>)}</select>
        </label>
      </div>}
      <div className="grid gap-4 sm:grid-cols-2">
        {locale!=="en"&&<div className="space-y-3">
          <label className="block text-sm font-semibold">{copy.localTitle}<input maxLength={180} required value={localizedTitle} onChange={e=>setLocalizedTitle(e.target.value)} className={inputClass}/></label>
          <label className="block text-sm font-semibold">{copy.localDescription}<textarea maxLength={4000} required rows={5} value={localizedDescription} onChange={e=>setLocalizedDescription(e.target.value)} className={inputClass}/></label>
        </div>}
        <div className="space-y-3">
          <label className="block text-sm font-semibold">{copy.englishTitle}<input maxLength={180} required value={titleEn} onChange={e=>setTitleEn(e.target.value)} className={inputClass}/></label>
          <label className="block text-sm font-semibold">{copy.englishDescription}<textarea maxLength={4000} required rows={5} value={descriptionEn} onChange={e=>setDescriptionEn(e.target.value)} className={inputClass}/></label>
        </div>
      </div>
      <label className="block text-sm font-semibold">{copy.reason}<textarea className={inputClass} rows={3} maxLength={1500} required value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{copy.pending}</p>
      {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {created&&<div role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">{copy.created}</p><p className="mt-1 break-all">{created.key}</p>
        <p className="mt-1 text-xs">{copy.blocked}</p>
        <div className="mt-3 flex flex-wrap gap-3"><a className="text-blue-700 underline" href={`/value-objects/${created.id}?locale=${locale}`}>{copy.open}</a>
        <button type="button" className="text-blue-700 underline" onClick={()=>{setCreated(null);requestIdRef.current=null;setLocalizedTitle("");setLocalizedDescription("");setTitleEn("");setDescriptionEn("");setReason("");}}>{copy.newNext}</button></div>
      </div>}
      {!created&&<button type="submit" disabled={busy||loading} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?copy.saving:copy.submit}</button>}
    </form>
  </div>;
}
