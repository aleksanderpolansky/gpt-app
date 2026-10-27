"use client";
import {useMemo,useState} from "react";
import {OntologyProposalHandoffV5} from "./OntologyProposalHandoffV5";
import {ON_ONLY_DEFAULT_SEARCH_SCRIPT,ON_ONLY_GUIDE} from "@/lib/ontology-research/onOnlyGuideV6";
import {buildIntakePrompt,parseIntakeResponse,INTAKE_COPY} from "@/lib/ontology-research/intakeBriefV61";
import {buildReviewPrompt,parseReviewResponse,type ReviewKind,type ReviewResult} from "@/lib/ontology-research/reviewV61";
import {buildResearchSessionExport,parseResearchStageAnswer,readableResearchItem} from "@/lib/ontology-research/researchResultV4";
import {LABELS,ONTO_AI_PILOT_CONTRACT,RESEARCH_STAGES,composeOntoPrompt,
  type OntoLocale,type ResearchStage,type ResearchContext,type ContextMode} from "@/lib/ontology-research/ontologyResearchV1";
import { DEFAULT_SEARCH_OPTIONS, normalizeExtraTerms, searchOptionParams, suggestedSearchQueries,
  type OntoResearchSearchOptions } from "@/lib/ontology-research/researchSearchStrategyV3";

type Quote={prompt:string;quoteHash:string;approvedMaxEur:number;canAfford:boolean;availableEur:number;modelName:string;operationId:string};
function safeReviewReference(input:{locale:OntoLocale;kind:ReviewKind;originalPrompt:string;answer:string}):string{
  try{return buildReviewPrompt(input);}catch{return "";}
}
type AuxiliaryKind="intake"|"reviewIntake"|"reviewStage";
type AuxiliaryQuote=Quote&{kind:AuxiliaryKind};
type ApiReply={ok?:boolean;errorCode?:string;mode?:string;quoteHash?:string;estimatedMaxEur?:number;canAfford?:boolean;
  availableEur?:number;modelName?:string;answer?:string;billedEur?:number;usageEventId?:string};
type SearchUiLabels = { toggle: string; allLanguages: string; paths: string; definitions: string; templates: string;
  limit: string; extraTerms: string; script: string; restore: string; proposed: string; addQuery: string;
  requery: string; methodHint: string; limitsHint: string; loadedQueries: string };
const SEARCH_UI: Record<OntoLocale, SearchUiLabels> = {
  ru: {toggle:"Настройки и скрипт поиска",allLanguages:"Искать объекты на семи языках",paths:"Искать в путях и родителях ОН",definitions:"Искать в определениях и описаниях",templates:"Учитывать названия типовых активностей как подсказку темы",limit:"Максимум выданных ОН",extraTerms:"Дополнительные запросы (по одному на строку, максимум 6)",script:"Методика поиска существующих ОН",restore:"Восстановить стандартный скрипт",proposed:"Запросы, предложенные моделью",addQuery:"Добавить к поиску",requery:"После добавления запросов нажмите «Получить контекст» ещё раз.",methodHint:"Настройки изменяют программный поиск. Скрипт передаётся модели после получения контекста; сам по себе он не выполняет поиск в Supabase.",limitsHint:"Выборка ограничена. Отсутствие совпадений не доказывает отсутствие объекта.",loadedQueries:"Фактически применённые поисковые выражения"},
  uk: {toggle:"Налаштування та скрипт пошуку",allLanguages:"Шукати сімома мовами",paths:"Шукати в шляхах і батьківських ОН",definitions:"Шукати у визначеннях та описах",templates:"Шукати типові активності",limit:"Максимум виданих ОН",extraTerms:"Додаткові запити (по одному на рядок, максимум 6)",script:"Скрипт для ШІ — пошук наявних ОН і типових активностей",restore:"Відновити типовий скрипт",proposed:"Запити, запропоновані моделлю",addQuery:"Додати до пошуку",requery:"Після додавання запитів отримайте контекст ще раз.",methodHint:"Налаштування змінюють програмний пошук. Скрипт надсилається моделі після отримання контексту.",limitsHint:"Вибірка обмежена. Відсутність збігів не доводить відсутності об’єкта.",loadedQueries:"Використані пошукові запити"},
  pl: {toggle:"Ustawienia i skrypt wyszukiwania",allLanguages:"Szukaj we wszystkich siedmiu językach",paths:"Szukaj w ścieżkach i rodzicach ON",definitions:"Szukaj w definicjach i opisach",templates:"Szukaj typowych aktywności",limit:"Maksymalna liczba wyników ON",extraTerms:"Dodatkowe zapytania (jedno w wierszu, maks. 6)",script:"Skrypt dla AI — wyszukiwanie istniejących ON i aktywności",restore:"Przywróć domyślny skrypt",proposed:"Zapytania proponowane przez model",addQuery:"Dodaj do wyszukiwania",requery:"Po dodaniu zapytań ponownie pobierz kontekst.",methodHint:"Ustawienia zmieniają wyszukiwanie w bazie; skrypt jest przekazywany modelowi po pobraniu kontekstu.",limitsHint:"Wyniki są ograniczone. Brak wyników nie dowodzi braku obiektu.",loadedQueries:"Użyte zapytania"},
  en: {toggle:"Search settings and AI script",allLanguages:"Search all seven languages",paths:"Search ON paths and parents",definitions:"Search definitions and descriptions",templates:"Use template names as topic hints",limit:"Maximum ON results",extraTerms:"Extra queries (one per line, max 6)",script:"AI method — find existing observation objects",restore:"Restore default script",proposed:"Model-suggested searches",addQuery:"Add to search",requery:"Reload context after adding search terms.",methodHint:"Settings control deterministic database search. The script is sent to AI after context retrieval; it does not query the database.",limitsHint:"This is a bounded snapshot. No match is not proof of absence.",loadedQueries:"Applied search terms"},
  de: {toggle:"Sucheinstellungen und KI-Skript",allLanguages:"In allen sieben Sprachen suchen",paths:"ON-Pfade und übergeordnete Knoten durchsuchen",definitions:"Definitionen und Beschreibungen durchsuchen",templates:"Typische Aktivitäten durchsuchen",limit:"Maximale ON-Ergebnisse",extraTerms:"Zusätzliche Suchbegriffe (eine Zeile pro Begriff, max. 6)",script:"KI-Skript — bestehende ON und typische Aktivitäten suchen",restore:"Standardskript wiederherstellen",proposed:"Vorgeschlagene Suchbegriffe",addQuery:"Zur Suche hinzufügen",requery:"Nach dem Hinzufügen Kontext erneut laden.",methodHint:"Einstellungen steuern die Datenbanksuche; das Skript wird erst danach an die KI übergeben.",limitsHint:"Begrenzte Trefferliste. Kein Treffer beweist keine Abwesenheit.",loadedQueries:"Verwendete Suchbegriffe"},
  es: {toggle:"Configuración y guion de búsqueda",allLanguages:"Buscar en los siete idiomas",paths:"Buscar en rutas y padres de ON",definitions:"Buscar definiciones y descripciones",templates:"Buscar actividades típicas",limit:"Máximo de resultados ON",extraTerms:"Consultas adicionales (una por línea, máximo 6)",script:"Guion de IA — buscar ON y actividades típicas existentes",restore:"Restaurar guion predeterminado",proposed:"Búsquedas sugeridas por el modelo",addQuery:"Añadir a la búsqueda",requery:"Vuelve a cargar el contexto después de añadir términos.",methodHint:"Las opciones controlan la búsqueda en la base. El guion se envía a la IA después de cargar el contexto.",limitsHint:"Resultados limitados. La ausencia de coincidencias no prueba la ausencia del objeto.",loadedQueries:"Términos de búsqueda aplicados"},
  cs: {toggle:"Nastavení a skript vyhledávání",allLanguages:"Hledat ve všech sedmi jazycích",paths:"Hledat v cestách a nadřazených ON",definitions:"Hledat v definicích a popisech",templates:"Hledat typické aktivity",limit:"Maximum výsledků ON",extraTerms:"Další dotazy (jeden na řádek, max. 6)",script:"Skript AI — hledání existujících ON a typických aktivit",restore:"Obnovit výchozí skript",proposed:"Dotazy navržené modelem",addQuery:"Přidat do hledání",requery:"Po přidání znovu načtěte kontext.",methodHint:"Nastavení řídí hledání v databázi; skript se odešle AI až po načtení kontextu.",limitsHint:"Omezené výsledky. Nenalezení neprokazuje neexistenci objektu.",loadedQueries:"Použité dotazy"},
};
const ctl="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-300";
function summarizeResponse(raw:string){
  const parsed=parseResearchStageAnswer(raw);
  return parsed.ok?parsed.result:null;
}
export default function ResearchClient({locale,canUseApi}:{locale:OntoLocale;canUseApi:boolean}){
  const labels=LABELS[locale];
  const guide=ON_ONLY_GUIDE[locale];
  const intake=INTAKE_COPY[locale];
  const searchLabels=SEARCH_UI[locale];
  const [objective,setObjective]=useState("");
  const [search,setSearch]=useState<string>("");
  const [shortTopic,setShortTopic]=useState("");
  const [intakePrompt,setIntakePrompt]=useState("");
  const [intakeReply,setIntakeReply]=useState("");
  const [intakeStatus,setIntakeStatus]=useState("");
  const [intakeMode,setIntakeMode]=useState<"external"|"api">("external");
  const [auxQuote,setAuxQuote]=useState<AuxiliaryQuote|null>(null);
  const [reviewReport,setReviewReport]=useState<ReviewResult|null>(null);
  const [reviewKindUsed,setReviewKindUsed]=useState<"intake"|"research"|null>(null);
  const [reviewSource,setReviewSource]=useState("");
  const [searchOptions,setSearchOptions]=useState<OntoResearchSearchOptions>(DEFAULT_SEARCH_OPTIONS);
  const [extraTermsText,setExtraTermsText]=useState("");
  const [searchScript,setSearchScript]=useState(ON_ONLY_DEFAULT_SEARCH_SCRIPT);
  const [showSearchSettings,setShowSearchSettings]=useState(false);
  const [context,setContext]=useState<ResearchContext|null>(null);
  const [contextMode,setContextMode]=useState<ContextMode>("compact");
  const [contextError,setContextError]=useState("");
  const [stage,setStage]=useState<ResearchStage>("questions");
  const [answers,setAnswers]=useState<Partial<Record<ResearchStage,string>>>({});
  const [drafts,setDrafts]=useState<Partial<Record<ResearchStage,string>>>({});
  const [mode,setMode]=useState<"external"|"api">("external");
  const [quote,setQuote]=useState<Quote|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [details,setDetails]=useState<Array<{kind:"on"|"template";id:string;data:Record<string,unknown>}>>([]);
  const [detailId,setDetailId]=useState("");
  const [detailKind,setDetailKind]=useState<"on"|"template">("on");
  const [detailBusy,setDetailBusy]=useState(false);
  const [detailError,setDetailError]=useState("");
  const [sessionEpoch,setSessionEpoch]=useState(0);
  const compactCopy:Record<OntoLocale,[string,string,string,string]>={
    ru:["Контекст исследования","Компактный — краткая проверенная сводка","Полный — все полученные сведения","В компактном режиме исключённые данные перечислены явно; полные ответы сохраняются в экспорте сессии."],
    uk:["Контекст дослідження","Компактний — перевірений підсумок","Повний — усі отримані дані","Пропущені в компактному режимі поля явно зазначені; повні відповіді лишаються в експорті сесії."],
    pl:["Kontekst badania","Zwięzły — zweryfikowane podsumowanie","Pełny — wszystkie dostępne dane","Pominięte pola są jawnie wskazane, a pełne odpowiedzi pozostają w eksporcie sesji."],
    en:["Research context","Compact — verified summary","Full — all fetched evidence","Compact mode explicitly lists omitted sections; full responses remain in the session export."],
    de:["Forschungskontext","Kompakt — geprüfte Zusammenfassung","Vollständig — alle Daten","Ausgelassene Felder werden explizit genannt; die vollständigen Antworten bleiben im Sitzungsexport."],
    es:["Contexto de investigación","Compacto — resumen verificado","Completo — todos los datos","Se indican los campos omitidos; las respuestas completas permanecen en la exportación de la sesión."],
    cs:["Kontext výzkumu","Stručný — ověřené shrnutí","Úplný — všechny údaje","Vynechaná pole jsou uvedena; úplné odpovědi zůstávají v exportu relace."],
  };
  const uiV4={
    ru:["Изучить ОН","Изучить шаблон","Детальная карточка по UUID","Получить данные","Проверенная карточка","Экспортировать текущую сессию","Ответ должен быть корректным JSON с summary","Слишком большой запрос для встроенного API (24 000 символов). Используйте внешний чат или уменьшите контекст с явным контролем.","Факты каталога: только чтение; неполные сведения не считаются отсутствующими.","Импортировать сохранённую сессию"],
    uk:["Вивчити ОН","Вивчити шаблон","Детальна картка за UUID","Отримати дані","Перевірена картка","Експортувати поточну сесію","Відповідь має бути коректним JSON із summary","Завеликий запит для вбудованого API (24 000 символів). Використайте зовнішній чат або свідомо скоротіть контекст.","Дані каталогу: лише читання; неповнота не означає відсутності.","Імпортувати збережену сесію"],
    pl:["Zbadaj ON","Zbadaj szablon","Szczegóły według UUID","Pobierz dane","Zweryfikowane dane","Eksportuj sesję","Odpowiedź musi być poprawnym JSON z summary","Zbyt duży kontekst dla wbudowanego API (24 000 znaków). Użyj zewnętrznego czatu lub świadomie ogranicz kontekst.","Katalog tylko do odczytu; brak danych nie oznacza braku obiektu.","Importuj zapisaną sesję"],
    en:["Inspect ON","Inspect template","Details by UUID","Fetch details","Verified catalog card","Export session","Answer must be valid JSON with summary","Prompt too large for built-in API (24,000 characters). Use external chat or explicitly reduce context.","Read-only catalog; unavailable fields do not imply absence.","Import saved session"],
    de:["ON prüfen","Vorlage prüfen","Details nach UUID","Details laden","Katalogdaten","Sitzung exportieren","Antwort muss gültiges JSON mit summary sein","Zu großer Text für die integrierte API (24.000 Zeichen). Externen Chat nutzen oder bewusst kürzen.","Katalog nur lesbar; fehlende Daten beweisen keine Abwesenheit.","Gespeicherte Sitzung importieren"],
    es:["Examinar ON","Examinar plantilla","Detalles por UUID","Obtener datos","Ficha verificada","Exportar sesión","La respuesta debe ser JSON válido con summary","Solicitud demasiado grande para API integrada (24.000 caracteres). Usa chat externo o reduce el contexto de manera explícita.","Catálogo de solo lectura; datos no disponibles no implican ausencia.","Importar sesión guardada"],
    cs:["Prozkoumat ON","Prozkoumat šablonu","Detail podle UUID","Načíst data","Ověřená karta","Exportovat relaci","Odpověď musí být platný JSON se summary","Vstup přesahuje limit integrované API (24 000 znaků). Použijte externí chat nebo vědomě zkraťte kontext.","Katalog pouze pro čtení; chybějící údaje neznamenají nepřítomnost.","Importovat uloženou relaci"],
  }[locale];
  const prompt=useMemo(()=>composeOntoPrompt({locale,stage,objective,search,context,prior:answers,searchScript,details:details.map(x=>x.data),contextMode}),
    [locale,stage,objective,search,context,answers,searchScript,details,contextMode]);
  const liveQuote=quote?.prompt===prompt?quote:null;
  const result=summarizeResponse(drafts[stage]??answers[stage]??"");
  const stageAnswer=drafts[stage]??answers[stage]??"";
  function buildAuxiliary(kind:AuxiliaryKind):{stage:"intake"|"review";prompt:string;payload:Record<string,string>}{
    if(kind==="intake"){
      if(!intakePrompt||intakePrompt!==buildIntakePrompt(shortTopic,locale))throw new Error("STEP0_PROMPT_STALE");
      return {stage:"intake",prompt:intakePrompt,payload:{intakeTopic:shortTopic}};
    }
    const reviewKind:ReviewKind=kind==="reviewIntake"?"intake":"research";
    const originalPrompt=reviewKind==="intake"?intakePrompt:prompt;
    const answer=reviewKind==="intake"?intakeReply:stageAnswer;
    const parsed=reviewKind==="intake"?parseIntakeResponse(answer):parseResearchStageAnswer(answer);
    if(!parsed.ok)throw new Error("VALID_JSON_ANSWER_REQUIRED_BEFORE_REVIEW");
    const reviewPrompt=buildReviewPrompt({locale,kind:reviewKind,originalPrompt,answer});
    return {stage:"review",prompt:reviewPrompt,payload:{reviewKind,reviewOriginalPrompt:originalPrompt,reviewAnswer:answer}};
  }
  function getAuxQuote(kind:AuxiliaryKind):AuxiliaryQuote|null{
    try{const p=buildAuxiliary(kind).prompt;return auxQuote?.kind===kind&&auxQuote.prompt===p?auxQuote:null;}
    catch{return null;}
  }
  async function runAuxiliary(kind:AuxiliaryKind,action:"quote"|"run"){
    const tell=(message:string)=>kind==="reviewStage"?setNotice(message):setIntakeStatus(message);
    if(!canUseApi){tell("Only platform owner/admin can spend AI EUR.");return;}
    let request:ReturnType<typeof buildAuxiliary>;
    try{request=buildAuxiliary(kind);}catch(e){tell(e instanceof Error?e.message:"INVALID_INPUT");return;}
    if(request.prompt.length>24000){tell("API_PROMPT_EXCEEDS_24000_CHARACTERS");return;}
    const current=getAuxQuote(kind);
    if(action==="run"&&(!current||!current.canAfford)){
      tell("REQUEST_VALID_AFFORDABLE_QUOTE_FIRST");return;
    }
    if(action==="run"&&!window.confirm(`Paid ONTO-AI ${kind}: approve up to ${current?.approvedMaxEur} EUR? No ON will be written.`))return;
    setBusy(true);tell("");
    try{
      const body={mode:action,stage:request.stage,locale,prompt:request.prompt,...request.payload,
        ...(action==="run"&&current?{quoteHash:current.quoteHash,approvedMaxEur:current.approvedMaxEur,operationId:current.operationId}:{})};
      const response=await fetch("/api/admin/ontology-research/model",{method:"POST",
        headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(body)});
      const data:ApiReply=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok)throw new Error(data.errorCode||`HTTP_${response.status}`);
      if(action==="quote"){
        if(typeof data.quoteHash!=="string"||typeof data.estimatedMaxEur!=="number")throw new Error("QUOTE_INVALID");
        setAuxQuote({kind,prompt:request.prompt,quoteHash:data.quoteHash,
          approvedMaxEur:data.estimatedMaxEur,canAfford:!!data.canAfford,
          availableEur:data.availableEur??0,modelName:data.modelName??"nano",
          operationId:`onto-ai:${crypto.randomUUID()}`});
        tell("QUOTE_READY_NO_AI_CALL_NO_ON_WRITES");
      }else{
        if(typeof data.answer!=="string")throw new Error("AI_ANSWER_MISSING");
        if(kind==="intake"){
          // Keep manual moderator decision: user must still click Apply.
          const parsed=parseIntakeResponse(data.answer);
          if(!parsed.ok)throw new Error(`AI_INTAKE_RESULT_INVALID:${parsed.error}`);
          setIntakeReply(JSON.stringify(parsed.value,null,2));
          setReviewReport(null);setReviewSource("");setReviewKindUsed(null);
        }else{
          const parsed=parseReviewResponse(data.answer);
          if(!parsed.ok)throw new Error(`AI_REVIEW_RESULT_INVALID:${parsed.error}`);
          setReviewReport(parsed.value);setReviewKindUsed(kind==="reviewIntake"?"intake":"research");
          setReviewSource(request.prompt);
        }
        setAuxQuote(null);
        tell(`AI EUR billed: ${data.billedEur??"?"}; usage ${data.usageEventId??"?"}. No ON written.`);
      }
    }catch(e){tell(`Stopped: ${e instanceof Error?e.message:"UNKNOWN"}`);}
    finally{setBusy(false);}
  }

  const suggestedTerms=suggestedSearchQueries(result);
  async function inspect(kind:"on"|"template",id:string){
    if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)){setDetailError("INVALID_UUID");return;}
    setDetailBusy(true);setDetailError("");setQuote(null);
    try{
      const params=new URLSearchParams({locale,[kind==="on"?"onId":"templateId"]:id});
      const response=await fetch(`/api/admin/ontology-research/details?${params}`,{cache:"no-store",credentials:"same-origin"});
      const data:Record<string,unknown>=await response.json().catch(()=>({}));
      if(!response.ok||data.ok!==true)throw new Error(typeof data.errorCode==="string"?data.errorCode:`HTTP_${response.status}`);
      setDetails(old=>[...old.filter(x=>!(x.kind===kind&&x.id===id)),{kind,id,data}]);
    }catch(error){setDetailError(error instanceof Error?error.message:"DETAIL_READ_FAILED");}
    finally{setDetailBusy(false);}
  }
  async function importSessionFile(file:File|undefined){
    if(!file)return;
    if(file.size>2_000_000){setNotice("FILE_TOO_LARGE_2MB");return;}
    try{
      const data:unknown=JSON.parse(await file.text());
      if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("INVALID_SESSION_OBJECT");
      const item=data as Record<string,unknown>;
      if(item.contract!=="ARCTOR_ONTO_AI_LOCAL_SESSION_EXPORT_V1")throw new Error("SESSION_CONTRACT_INVALID");
      const nextAnswers:Partial<Record<ResearchStage,string>>={};
      const source=item.answers&&typeof item.answers==="object"&&!Array.isArray(item.answers)?item.answers as Record<string,unknown>:{};
      for(const key of RESEARCH_STAGES){
        if(typeof source[key]!=="string")continue;
        const parsed=parseResearchStageAnswer(source[key]);
        if(!parsed.ok)throw new Error(`INVALID_SAVED_STAGE_${key}:${parsed.error}`);
        nextAnswers[key]=JSON.stringify(parsed.result);
      }
      const nextDrafts:Partial<Record<ResearchStage,string>>={};
      const oldDrafts=item.drafts&&typeof item.drafts==="object"&&!Array.isArray(item.drafts)?item.drafts as Record<string,unknown>:{};
      for(const key of RESEARCH_STAGES){if(typeof oldDrafts[key]==="string")nextDrafts[key]=oldDrafts[key];}
      setAnswers(nextAnswers);setDrafts(nextDrafts);
      if(typeof item.objective==="string")setObjective(item.objective.slice(0,2500));
      setShortTopic(typeof item.shortTopic==="string"?item.shortTopic.slice(0,180):"");
      setIntakePrompt(typeof item.intakePrompt==="string"?item.intakePrompt.slice(0,6000):"");
      setIntakeReply(typeof item.intakeReply==="string"?item.intakeReply.slice(0,32000):"");
      setIntakeStatus("");
      if(typeof item.search==="string")setSearch(item.search.slice(0,180));
      if(typeof item.searchScript==="string")setSearchScript(item.searchScript.slice(0,3800));
      if(typeof item.extraTermsText==="string")setExtraTermsText(item.extraTermsText.slice(0,650));
      if(RESEARCH_STAGES.some(x=>x===item.stage))setStage(item.stage as ResearchStage);
      // Always refresh the database evidence; never trust imported catalog snapshot.
      if(item.contextMode==="full"||item.contextMode==="compact")setContextMode(item.contextMode);
      setContext(null);setDetails([]);setQuote(null);setAuxQuote(null);setSessionEpoch(x=>x+1);
      if(item.reviewReport&&typeof item.reviewReport==="object"){
        const validated=parseReviewResponse(JSON.stringify(item.reviewReport));
        if(validated.ok&&typeof item.reviewSource==="string"&&item.reviewSource.length<=24000&&
           (item.reviewKindUsed==="intake"||item.reviewKindUsed==="research")){
          setReviewReport(validated.value);setReviewSource(item.reviewSource);setReviewKindUsed(item.reviewKindUsed);
        }else{setReviewReport(null);setReviewSource("");setReviewKindUsed(null);}
      }else{setReviewReport(null);setReviewSource("");setReviewKindUsed(null);}
      setNotice(guide.needContext+" "+guide.saveHint);
    }catch(error){setNotice(error instanceof Error?error.message:"SESSION_IMPORT_FAILED");}
  }
  async function importStageFile(file:File|undefined){
    if(!file)return;
    if(file.size>2_000_000){setNotice("FILE_TOO_LARGE_2MB");return;}
    const body=await file.text();
    const parsed=parseResearchStageAnswer(body);
    if(!parsed.ok){setNotice(`${uiV4[6]}: ${parsed.error}`);return;}
    setDrafts(old=>({...old,[stage]:JSON.stringify(parsed.result)}));
    setNotice(guide.importHint);
  }
  function exportSession(){
    const data=JSON.parse(buildResearchSessionExport({objective,search,answers,drafts}));
    const json=JSON.stringify({...data,stage,searchOptions,extraTermsText,searchScript,contextMode,shortTopic,intakePrompt,intakeReply,reviewReport,reviewKindUsed,reviewSource},null,2);
    const blob=new Blob([json],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="ARCTOR_ONTO_AI_LOCAL_SESSION.json";a.click();
    URL.revokeObjectURL(url);
  }
  function startNewResearch(){
    if((Object.keys(answers).length||Object.keys(drafts).length)&&!window.confirm(guide.confirmReset))return;
    setObjective("");setSearch("");setShortTopic("");setIntakePrompt("");setIntakeReply("");setIntakeStatus("");
    setContext(null);setContextError("");setDetails([]);setDetailId("");setDetailError("");
    setAnswers({});setDrafts({});setStage("questions");setQuote(null);setMode("external");setIntakeMode("external");
    setAuxQuote(null);setReviewReport(null);setReviewKindUsed(null);setReviewSource("");
    setExtraTermsText("");setSearchOptions(DEFAULT_SEARCH_OPTIONS);setSearchScript(ON_ONLY_DEFAULT_SEARCH_SCRIPT);
    setContextMode("compact");setNotice("");setSessionEpoch(x=>x+1);
  }
  function prepareIntake(){
    try {setIntakePrompt(buildIntakePrompt(shortTopic,locale));setIntakeReply("");setIntakeStatus("");setAuxQuote(null);setReviewReport(null);}
    catch {setIntakeStatus(intake.needTopic);}
  }
  async function copyIntake(){
    if(!intakePrompt)return;
    try{await navigator.clipboard.writeText(intakePrompt);setIntakeStatus(intake.steps);}
    catch{setIntakeStatus(intake.copyFailed);}
  }
  function applyIntake(){
    const parsed=parseIntakeResponse(intakeReply);
    if(!parsed.ok){setIntakeStatus(`${intake.invalid} (${parsed.error})`);return;}
    if(parsed.value.needsClarification){
      setIntakeStatus(`${intake.ambiguous} ${parsed.value.clarificationQuestions.join(" | ")}`);
      return;
    }
    if((Object.keys(answers).length||Object.keys(drafts).length)&&!window.confirm(guide.confirmReset))return;
    setObjective(parsed.value.researchTask);
    setSearch((parsed.value.searchTerms[0]??shortTopic).slice(0,180));
    setExtraTermsText(parsed.value.searchTerms.slice(1,6).join("\n"));
    setContext(null);setContextError("");setDetails([]);setQuote(null);setAnswers({});setDrafts({});
    setStage("questions");setSessionEpoch(x=>x+1);setNotice("");
    setIntakeStatus(intake.afterApply);
  }
  function selectStage(value:ResearchStage){setStage(value);setQuote(null);setNotice("");}
  function updateOption<K extends keyof OntoResearchSearchOptions>(key:K,value:OntoResearchSearchOptions[K]){
    setSearchOptions(prev=>({...prev,[key]:value}));setContext(null);setQuote(null);
  }
  function addSuggestedTerm(term:string){
    const all=normalizeExtraTerms([extraTermsText,term]);
    setExtraTermsText(all.join("\n"));setContext(null);setQuote(null);
    setNotice(searchLabels.requery);
  }
  async function readContext(){
    setBusy(true);setContext(null);setQuote(null);setNotice("");setContextError("");
    try{const params=searchOptionParams({...searchOptions,extraTerms:normalizeExtraTerms(extraTermsText)});
      params.set("q",search);params.set("locale",locale);
      const res=await fetch(`/api/admin/ontology-research/context?${params.toString()}`,{cache:"no-store",credentials:"same-origin"});
      const data:ResearchContext&{ok?:boolean;errorCode?:string}=await res.json();
      if(!res.ok||!data.ok||data.contract!==ONTO_AI_PILOT_CONTRACT)throw new Error(data.errorCode||`HTTP_${res.status}`);
      setContext(data);setDetails([]);
    }catch(e){setContextError(e instanceof Error?e.message:"READ_ERROR");}
    finally{setBusy(false);}
  }
  async function copyPrompt(){
    try{await navigator.clipboard.writeText(prompt);setNotice(guide.externalHint);}
    catch{setNotice(guide.copyHint);}
  }
  function acceptAnswer(){
    const text=(drafts[stage]??"").trim();
    if(!text){setNotice("Paste or generate the answer first.");return;}
    const parsed=parseResearchStageAnswer(text);
    if(!parsed.ok){setNotice(`${uiV4[6]}: ${parsed.error}`);return;}
    if(!context){setNotice(guide.needContext);return;}
    if((stage==="design"||stage==="critique")&&!Array.isArray((parsed.result as unknown as Record<string,unknown>).onCandidates)){
      setNotice(guide.needCandidates);return;
    }
    setAnswers(prev=>({...prev,[stage]:JSON.stringify(parsed.result)}));setNotice(guide.accepted);
  }
  async function callModel(action:"quote"|"run"){
    if(!canUseApi){setNotice("Only owner/admin can spend AI EUR.");return;}
    if(prompt.length>24000){setNotice(uiV4[7]);return;}
    if(action==="run"&&(!liveQuote||!liveQuote.canAfford)){setNotice("Request a valid affordable quote first.");return;}
    if(action==="run"&&!window.confirm(`Платный вызов ${liveQuote?.modelName}. Подтверждаете списание в пределах ${liveQuote?.approvedMaxEur} EUR? Никакие ОН созданы не будут.`))return;
    setBusy(true);setNotice("");
    try {
      const dataToSend={mode:action,prompt,stage,locale,...(action==="run"&&liveQuote?{
        quoteHash:liveQuote.quoteHash,approvedMaxEur:liveQuote.approvedMaxEur,operationId:liveQuote.operationId}: {})};
      const response=await fetch("/api/admin/ontology-research/model",{
        method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(dataToSend)});
      const data:ApiReply=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok)throw new Error(data.errorCode||`HTTP_${response.status}`);
      if(action==="quote"){
        if(typeof data.quoteHash!=="string"||typeof data.estimatedMaxEur!=="number")throw new Error("QUOTE_INVALID");
        setQuote({prompt,quoteHash:data.quoteHash,approvedMaxEur:data.estimatedMaxEur,
          canAfford:!!data.canAfford,availableEur:data.availableEur??0,modelName:data.modelName??"nano",
          operationId:`onto-ai:${crypto.randomUUID()}`});
        setNotice("Quote prepared; no AI call. Confirm explicitly before run.");
      }else {
        setDrafts(prev=>({...prev,[stage]:data.answer??""}));
        setQuote(null);
        setNotice(`AI EUR debited: ${data.billedEur??"?"}; usage ${data.usageEventId??"?"}. Confirm the result to use it at the next stage.`);
      }
    }catch(e){setNotice(`Stopped: ${e instanceof Error?e.message:"UNKNOWN"}`);}
    finally{setBusy(false);}
  }
  return <article className="space-y-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-6">
    <header className="space-y-3"><h1 className="text-2xl font-bold text-slate-900">{guide.title}</h1>
      <p className="text-sm text-slate-700">{guide.subtitle}</p>
      <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-950">{guide.workflow}</p>
      <p className="text-sm font-medium text-emerald-800">{guide.scope}</p>
      <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={startNewResearch}>{intake.reset}</button>
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-950">Главный куратор модели · ADM-2 «Семантическая модель». Должностные права на запись пока не активированы; страница доступна platform owner/admin/viewer (viewer без API).</p>
    </header>
    <section className="space-y-3 rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4" aria-label={intake.heading}>
      <h2 className="text-lg font-bold text-slate-950">{intake.heading}</h2>
      <p className="text-sm text-slate-700">{intake.explanation}</p>
      <label className="block text-sm font-semibold">{intake.briefLabel}
        <input className={`${ctl} mt-1`} value={shortTopic} maxLength={180} placeholder={intake.briefPlaceholder}
          onChange={e=>{setShortTopic(e.target.value);setIntakePrompt("");setIntakeReply("");setIntakeStatus(intake.changed);setAuxQuote(null);setReviewReport(null);}} />
      </label>
      <p className="text-xs text-slate-600">{intake.briefHint}</p>
      <button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        disabled={shortTopic.trim().length<2} onClick={prepareIntake}>{intake.prepare}</button>
      {intakePrompt&&<div className="space-y-3 rounded-lg border border-blue-200 bg-white p-3">
        <label className="block text-sm font-semibold">{intake.promptLabel}
          <textarea className={`${ctl} mt-1 font-mono text-xs`} readOnly rows={7} value={intakePrompt} />
        </label>
        <button type="button" className="rounded-lg border border-blue-600 px-3 py-2 text-sm text-blue-700" onClick={()=>void copyIntake()}>{intake.copy}</button>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 text-sm">
          <p className="font-semibold">{locale==="ru"?"Исполнитель шага 0":"Step 0 executor"}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={()=>{setIntakeMode("external");setAuxQuote(null);}} className={`rounded px-3 py-2 ${intakeMode==="external"?"bg-blue-600 text-white":"bg-white border"}`}>{LABELS[locale].external}</button>
            <button type="button" onClick={()=>{setIntakeMode("api");setAuxQuote(null);}} className={`rounded px-3 py-2 ${intakeMode==="api"?"bg-blue-600 text-white":"bg-white border"}`}>{LABELS[locale].billable}</button>
          </div>
          {intakeMode==="api"&&<div className="space-y-2">
            <p>{locale==="ru"?"Тот же самый текст задания. Сначала бесплатная смета, затем отдельное подтверждение расходов.":"Same prompt. Free quote first, explicit paid confirmation before execution."}</p>
            <button type="button" disabled={busy||!canUseApi} className="rounded bg-slate-800 px-3 py-2 text-white disabled:opacity-40" onClick={()=>void runAuxiliary("intake","quote")}>{labels.quote}</button>
            {getAuxQuote("intake")&&<p>{getAuxQuote("intake")?.approvedMaxEur} EUR · {getAuxQuote("intake")?.modelName} · {getAuxQuote("intake")?.canAfford?"Balance OK":"Insufficient funds"}</p>}
            <button type="button" disabled={busy||!getAuxQuote("intake")?.canAfford} className="rounded bg-orange-600 px-3 py-2 text-white disabled:opacity-40" onClick={()=>void runAuxiliary("intake","run")}>{labels.apiRun}</button>
          </div>}
        </div>
        <p className="text-sm text-slate-700">{intake.steps}</p>
        <label className="block text-sm font-semibold">{intake.pasteLabel}
          <textarea className={`${ctl} mt-1 font-mono text-xs`} rows={6} value={intakeReply} maxLength={32000}
            onChange={e=>{setIntakeReply(e.target.value);setIntakeStatus("");}} />
        </label>
        <button type="button" disabled={!intakeReply.trim()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" onClick={applyIntake}>{intake.apply}</button>
        <div className="rounded-lg border border-blue-200 p-3 space-y-2 text-sm">
          <p className="font-semibold">{locale==="ru"?"Независимая проверка ответа внешнего ИИ (необязательно)":"Optional independent AI review"}</p>
          <p className="text-xs text-slate-600">{locale==="ru"?"Без вызова API проверка JSON выполняется кнопкой применения. Отдельная содержательная рецензия платная и ничего не утверждает автоматически.":"JSON parsing is local; paid review does not approve the content."}</p>
          <button type="button" disabled={busy||!parseIntakeResponse(intakeReply).ok} className="rounded bg-slate-800 px-3 py-2 text-white disabled:opacity-40" onClick={()=>void runAuxiliary("reviewIntake","quote")}>{locale==="ru"?"Рассчитать цену рецензии":"Quote review"}</button>
          {getAuxQuote("reviewIntake")&&<span className="ml-2">{getAuxQuote("reviewIntake")?.approvedMaxEur} EUR · {getAuxQuote("reviewIntake")?.modelName}</span>}
          <button type="button" disabled={busy||!getAuxQuote("reviewIntake")?.canAfford} className="ml-2 rounded bg-orange-600 px-3 py-2 text-white disabled:opacity-40" onClick={()=>void runAuxiliary("reviewIntake","run")}>{locale==="ru"?"Проверить внутренним ИИ":"Run internal AI review"}</button>
        </div>
        {reviewKindUsed==="intake"&&reviewReport&&reviewSource===safeReviewReference({locale,kind:"intake",originalPrompt:intakePrompt,answer:intakeReply})&&<section className="rounded border p-3 text-sm space-y-1" aria-label="Independent AI review"><b>{reviewReport.assessment}: {reviewReport.summary}</b>
          <p>{reviewReport.issues.join(" | ")}</p><p>{reviewReport.recommendations.join(" | ")}</p><p>{reviewReport.evidenceGaps.join(" | ")}</p>
          <p className="text-xs text-amber-900">{locale==="ru"?"Рецензия — рекомендация ИИ, не проверка базы и не решение модератора.":"AI review is not a catalog verification or approval."}</p>
        </section>}
      </div>}
      <p role="status" className="text-sm text-blue-900">{intakeStatus||intake.free}</p>
    </section>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-semibold">{labels.objective}
        <textarea value={objective} onChange={e=>{setObjective(e.target.value.slice(0,2500));setQuote(null);}} rows={5} className={`${ctl} mt-1`} placeholder={intake.pending}/>
        <p className="mt-1 text-xs font-normal text-slate-600">{guide.topicHint}</p>
      </label>
      <div className="space-y-2"><label className="block text-sm font-semibold">{labels.search}
        <input className={`${ctl} mt-1`} value={search} maxLength={180} onChange={e=>{setSearch(e.target.value);setContext(null);setQuote(null);}} placeholder={intake.briefPlaceholder}/>
      </label><button type="button" disabled={busy||search.trim().length<2} onClick={()=>void readContext()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{labels.refresh}</button>
        <p className="text-xs text-slate-600">{guide.searchHint}</p>
        <p className="text-xs text-slate-500">{labels.noCalls}</p>
        {contextError&&<p role="alert" className="text-xs text-red-600">{contextError}</p>}
      </div>
    </div>
    <section className="rounded-xl border border-blue-100 bg-slate-50 p-3">
      <button type="button" className="w-full text-left text-sm font-semibold text-blue-700" aria-expanded={showSearchSettings}
        onClick={()=>setShowSearchSettings(v=>!v)}>{searchLabels.toggle} {showSearchSettings?"▴":"▾"}</button>
      {showSearchSettings&&<div className="mt-3 space-y-4">
        <div className="grid gap-2 md:grid-cols-2">
          {([
            ["allLocales",searchLabels.allLanguages],["includePaths",searchLabels.paths],
            ["includeDefinitions",searchLabels.definitions],["includeTemplates",searchLabels.templates],
          ] as const).map(([key,title])=><label key={key} className="flex items-center gap-2 text-sm text-slate-800">
            <input type="checkbox" checked={searchOptions[key]} onChange={e=>updateOption(key,e.target.checked)} />{title}
          </label>)}
        </div>
        <label className="block text-sm font-semibold">{searchLabels.limit}
          <select className={`${ctl} mt-1`} value={searchOptions.maxOnMatches} onChange={e=>updateOption("maxOnMatches",Number(e.target.value) as 15|35|100)}>
            <option value={15}>15</option><option value={35}>35</option><option value={100}>100</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">{searchLabels.extraTerms}
          <textarea rows={3} className={`${ctl} mt-1`} value={extraTermsText}
            onChange={e=>{setExtraTermsText(e.target.value.slice(0,650));setContext(null);setQuote(null);}} />
        </label>
        <label className="block text-sm font-semibold">{searchLabels.script}
          <textarea rows={9} className={`${ctl} mt-1 font-mono text-xs`} value={searchScript} maxLength={3800}
            onChange={e=>{setSearchScript(e.target.value);setQuote(null);}}/>
        </label>
        <button type="button" className="rounded-lg border border-blue-400 px-3 py-2 text-sm text-blue-700"
          onClick={()=>{setSearchScript(ON_ONLY_DEFAULT_SEARCH_SCRIPT);setQuote(null);}}>{searchLabels.restore}</button>
        <p className="text-xs text-slate-600">{searchLabels.methodHint}</p>
        <p className="text-xs text-amber-800">{searchLabels.limitsHint}</p>
      </div>}
    </section>
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h2 className="font-semibold">{labels.context}</h2>
      <p className="mt-1 text-xs text-slate-600">{guide.getContextHint}</p>
      {context?<div className="mt-2 space-y-1 text-xs text-slate-700">
        <p>ОН: {context.ontology.length} · Просмотрено ОН: {context.scanned.ontology}. {guide.scope}</p>
        {context.searchDetails&&<p>{searchLabels.loadedQueries}: {context.searchDetails.terms.join("; ")} ·
          {context.searchDetails.matchedOn} / {context.ontology.length} ON.
          {(context.searchDetails.onTruncated||context.searchDetails.templateTruncated)&&" Результаты ограничены."}</p>}
        <p>{context.ontology.slice(0,6).map(x=>x.path).join("; ")||"ОН не найдены по этому запросу; это не доказывает их отсутствия."}</p>
        <div className="mt-2 max-h-64 space-y-1 overflow-auto">
          {context.ontology.map(item=><div key={item.id} className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-white p-2">
            <span className="min-w-0 truncate" title={item.path}>{item.title} · {item.role}</span>
            <button type="button" disabled={detailBusy} className="shrink-0 rounded border border-blue-400 px-2 py-1 text-blue-700 disabled:opacity-50" onClick={()=>void inspect("on",item.id)}>{uiV4[0]}</button>
          </div>)}
        </div>
        {context.warnings.map((w,i)=><p key={i} className="text-amber-800">{w}</p>)}
      </div>:<p className="mt-1 text-xs text-amber-800">Сначала загрузите контекст. Без него вывод о том, что ОН отсутствует, недопустим.</p>}
    </section>
    <section className="space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm">
      <h3 className="font-semibold">{uiV4[2]}</h3>
      <div className="flex flex-wrap gap-2"><select value={detailKind} onChange={e=>setDetailKind(e.target.value as "on"|"template")} className={ctl} style={{maxWidth:220}}>
        <option value="on">ОН</option>
      </select><input aria-label="UUID" value={detailId} onChange={e=>setDetailId(e.target.value)} className={ctl} style={{maxWidth:360}} placeholder="UUID" />
      <button type="button" disabled={detailBusy} className="rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50" onClick={()=>void inspect(detailKind,detailId.trim())}>{uiV4[3]}</button></div>
      {detailError&&<p role="alert" className="text-red-600">{detailError}</p>}
      <p className="text-xs text-slate-600">{guide.detailHint} {uiV4[8]}</p>
      {details.map((item)=><details key={`${item.kind}:${item.id}`} className="rounded border bg-white p-2">
        <summary className="cursor-pointer font-semibold">{uiV4[4]} · {item.kind} · {item.id}</summary>
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(item.data,null,2)}</pre>
      </details>)}
    </section>
    <nav className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Research stages">
      {RESEARCH_STAGES.map((v,i)=><button key={v} type="button" onClick={()=>selectStage(v)}
        className={`rounded-lg border px-3 py-3 text-left text-sm ${stage===v?"border-blue-600 bg-blue-50 font-bold text-blue-800":"border-slate-300 text-slate-700"}`}>
        {guide.stageTitles[i]} {answers[v]?"✓":""}
      </button>)}
    </nav>
    <section className="space-y-3">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
        <h2 className="mb-1 font-bold text-blue-900">{guide.stageTitles[RESEARCH_STAGES.indexOf(stage)]}</h2>
        <p className="text-blue-950">{guide.stageHelp[stage]}</p>
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <label className="font-semibold">{compactCopy[locale][0]}
          <select className={`${ctl} mt-2`} value={contextMode} onChange={e=>{setContextMode(e.target.value as ContextMode);setQuote(null);}}>
            <option value="compact">{compactCopy[locale][1]}</option>
            <option value="full">{compactCopy[locale][2]}</option>
          </select>
        </label>
        <p className="mt-1 text-xs">{compactCopy[locale][3]}</p>
      </div>
      <h2 className="font-semibold">{labels.prompt}</h2>
      <p className="text-sm text-slate-600">{guide.copyHint}</p>
      <textarea readOnly className={`${ctl} font-mono text-xs`} value={prompt} rows={10}/>
      <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={()=>void copyPrompt()} className="rounded-lg border border-blue-500 px-4 py-2 text-sm text-blue-700">{labels.copy}</button>
        <button type="button" className="rounded-lg border border-slate-400 px-4 py-2 text-sm" onClick={exportSession}>{uiV4[5]}</button>
        <label className="cursor-pointer rounded-lg border border-slate-400 px-4 py-2 text-sm">{uiV4[9]}
          <input className="sr-only" type="file" accept=".json,application/json" aria-label="Import saved research session"
            onChange={e=>{void importSessionFile(e.target.files?.[0]);e.target.value="";}} />
        </label>
        <span className={`text-xs ${prompt.length>24000?"text-red-700":"text-slate-600"}`}>Prompt: {prompt.length.toLocaleString()} characters</span></div>
      {prompt.length>24000&&<p role="alert" className="text-sm text-amber-800">{uiV4[7]}</p>}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <h3 className="mb-2 font-semibold">{guide.stepsTitle}</h3>
        <p>{guide.copyHint}</p><p className="mt-1">{guide.externalHint}</p>
        <p className="mt-1">{guide.importHint}</p><p className="mt-1">{guide.acceptHint}</p>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
        <button type="button" onClick={()=>{setMode("external");setQuote(null);}} className={`rounded-lg px-3 py-2 text-sm ${mode==="external"?"bg-blue-600 text-white":"bg-slate-100"}`}>{labels.external}</button>
        <button type="button" onClick={()=>{setMode("api");setQuote(null);}} className={`rounded-lg px-3 py-2 text-sm ${mode==="api"?"bg-blue-600 text-white":"bg-slate-100"}`}>{labels.billable}</button>
      </div>
      {mode==="api"&&<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <p>Цена зависит от действующего AI EUR прайса. Предварительный расчёт бесплатный; вызов выполняется только после отдельного подтверждения.</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy||!canUseApi||!context||prompt.length>24000} onClick={()=>void callModel("quote")} className="rounded-lg bg-slate-800 px-3 py-2 text-white disabled:opacity-40">{labels.quote}</button>
          {liveQuote&&<span className="text-sm">Макс. резерв: {liveQuote.approvedMaxEur} EUR · Доступно: {liveQuote.availableEur} EUR · {liveQuote.canAfford?"Баланс достаточен":"Недостаточно средств"}</span>}
          <button type="button" disabled={!liveQuote?.canAfford||busy} onClick={()=>void callModel("run")} className="rounded-lg bg-orange-600 px-3 py-2 text-white disabled:opacity-40">{labels.apiRun}</button>
        </div>
      </div>}
      <label className="block text-xs text-blue-700">{guide.importHint} — JSON →
        <input type="file" accept=".json,application/json" className="ml-3 text-xs" aria-label="Import JSON stage response"
          onChange={e=>{void importStageFile(e.target.files?.[0]);e.target.value="";}} />
      </label>
      <label className="block text-sm font-semibold">{labels.paste}
        <textarea rows={9} className={`${ctl} mt-1 font-mono text-xs`} value={drafts[stage]??answers[stage]??""}
          onChange={e=>setDrafts(p=>({...p,[stage]:e.target.value}))}/>
      </label>
      <div className="rounded-lg border border-blue-200 bg-white p-3 space-y-2 text-sm">
        <p className="font-semibold">{locale==="ru"?"Независимое рецензирование вставленного ответа внутренней моделью":"Independent internal model review of pasted reply"}</p>
        <p className="text-xs text-slate-600">{locale==="ru"?"Один и тот же исследовательский запрос доступен внешнему и встроенному ИИ. Рецензия отдельная, платная, не заменяет ответ и не создаёт ОН.":"Same research task in both contours. Optional paid review neither applies nor approves anything."}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy||!parseResearchStageAnswer(stageAnswer).ok} className="rounded bg-slate-800 px-3 py-2 text-white disabled:opacity-40" onClick={()=>void runAuxiliary("reviewStage","quote")}>{locale==="ru"?"Рассчитать стоимость проверки":"Quote review"}</button>
          {getAuxQuote("reviewStage")&&<span>{getAuxQuote("reviewStage")?.approvedMaxEur} EUR · {getAuxQuote("reviewStage")?.modelName}</span>}
          <button type="button" disabled={busy||!getAuxQuote("reviewStage")?.canAfford} className="rounded bg-orange-600 px-3 py-2 text-white disabled:opacity-40" onClick={()=>void runAuxiliary("reviewStage","run")}>{locale==="ru"?"Проверить внутренним ИИ":"Run internal AI review"}</button>
        </div>
        {reviewKindUsed==="research"&&reviewReport&&reviewSource===safeReviewReference({locale,kind:"research",originalPrompt:prompt,answer:stageAnswer})&&<div className="rounded bg-slate-50 p-2"><b>{reviewReport.assessment}: {reviewReport.summary}</b><p>{reviewReport.issues.join(" | ")}</p><p>{reviewReport.recommendations.join(" | ")}</p><p>{reviewReport.evidenceGaps.join(" | ")}</p><p className="text-xs text-amber-900">Review is advice, not database verification or curator approval.</p></div>}
      </div>
      {suggestedTerms.length>0&&<div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
        <h3 className="mb-2 font-semibold">{searchLabels.proposed}</h3>
        <div className="space-y-2">{suggestedTerms.map(term=><div key={term} className="flex flex-wrap items-center justify-between gap-2">
          <span>{term}</span><button type="button" className="rounded border border-blue-400 px-2 py-1 text-xs text-blue-700"
          onClick={()=>addSuggestedTerm(term)}>{searchLabels.addQuery}</button></div>)}</div>
      </div>}
      {result&&<div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
        <h3 className="font-semibold">{labels.result}</h3><p className="mt-1">{String(result.summary)}</p>
        {(["questions","existingOn","proposals","risks","nextSteps","uncertainties"] as const).map(k=>Array.isArray(result[k])&&<div key={k} className="mt-2"><strong>{k}</strong>
          <ul className="ml-5 list-disc">{(result[k] as unknown[]).map((v,i)=><li key={i} className="mb-1 break-words">{readableResearchItem(v)}</li>)}</ul></div>)}
      </div>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={acceptAnswer} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white">{labels.save}</button>
        {RESEARCH_STAGES.indexOf(stage)<RESEARCH_STAGES.length-1&&<button type="button" onClick={()=>selectStage(RESEARCH_STAGES[RESEARCH_STAGES.indexOf(stage)+1])} className="rounded-lg border px-4 py-2 text-sm">{guide.next}</button>}
      </div>
      <p className="text-sm font-medium text-blue-800">{guide.registerHint}</p>
      <OntologyProposalHandoffV5 key={sessionEpoch} locale={locale} answers={answers} context={context} details={details} />
      <p role="status" aria-live="polite" className="text-xs text-blue-700">{notice}</p>
      <p className="text-xs text-slate-500">{guide.saveHint} {guide.resultHint}</p>
    </section>
  </article>;
}
