import { localizeGlobalSystemValueObject } from "@/lib/reality-core/global-system-value-object-localization";
import type { AiLabUiLocale } from "@/lib/activity/aiLabUiCopy";

type TraceKind = "system" | "model" | "check" | "fact" | "meaning" | "unresolved" | "fallback";
type FeedbackTargetKind = "primary_selection" | "fact" | "semantic_projection" | "unresolved";

type FeedbackDescriptor = {
  targetKind: FeedbackTargetKind;
  targetKey: string;
  targetValueObjectId?: string | null;
  sourceContractCode?: string | null;
  proposalSnapshot: Record<string, unknown>;
  rationale: string;
};

export type LocalizedAiLabTraceLine = {
  kind: TraceKind;
  text: string;
  feedback?: FeedbackDescriptor;
};

type Candidate = {
  valueObjectId?: string;
  canonicalKey?: string;
  title?: string;
};

type Preview = {
  contractVersion?: string;
  model?: string;
  modelTier?: string;
  rows?: Array<{
    segmentId?: string;
    selected?: {
      valueObjectId?: string;
      canonicalKey?: string;
      title?: string;
      semanticMatchMethodCode?: string;
    } | null;
    confidence?: number;
    facts?: Array<{
      parameterCode?: string;
      unit?: string;
      valueNumeric?: number | null;
      valueText?: string | null;
      valueBoolean?: boolean | null;
      factStatus?: string;
    }>;
    semanticProjections?: Array<{
      contractVersion?: string;
      projectionCode?: string;
      epistemicStatus?: string;
      targetCanonicalKey?: string;
      targetValueObjectId?: string;
      targetTitle?: string;
      writeAllowed?: boolean;
    }>;
    temporal?: {
      occurredAtIso?: string | null;
      temporalPrecision?: string;
    };
  }>;
  analysisTrace?: {
    candidateGroups?: Array<{
      segmentId?: string;
      resolutionMode?: string;
      exactMatchKind?: string | null;
      candidates?: Candidate[];
    }>;
  };
  safety?: {
    providerCallsUsed?: number;
    automaticProviderRetries?: number;
    actualProviderCostUsd?: number | null;
    hardCapUsd?: number;
  };
};

type Copy = {
  received: (text: string) => string;
  started: (model: string, tier: string) => string;
  observation: (n: number, text: string) => string;
  candidates: (count: number, names: string) => string;
  selected: (name: string, confidence: string) => string;
  selectedReason: (count: number, confidence: string) => string;
  unresolved: (text: string) => string;
  unresolvedReason: (count: number) => string;
  time: (precision: string, iso: string) => string;
  noFacts: (n: number) => string;
  fact: (number: number, value: string, status: string) => string;
  factReason: string;
  meaning: (target: string, status: string) => string;
  meaningReason: string;
  safety: (calls: number, retries: number, cost: string, cap: string) => string;
  finished: string;
  unknown: string;
};

const C: Record<AiLabUiLocale, Copy> = {
  en: {
    received: (t) => `Message received: “${t}”`,
    started: (m, tier) => `Global Reality analysis started. Model: ${m}; tier: ${tier}.`,
    observation: (n, t) => `Observation ${n}: the activity text is “${t}”.`,
    candidates: (n, names) => `Value/Observation Object check: the server returned ${n} allowed candidate(s)${names ? `: ${names}` : "."}`,
    selected: (n, c) => `Model selection: “${n}”. Model confidence inside the allowed candidate set: ${c}.`,
    selectedReason: (n, c) => `The model selected only from ${n} server candidates. Its own selection confidence was ${c}.`,
    unresolved: (t) => `No leaf Value/Observation Object was selected for “${t}”. The result remains unresolved instead of inventing an object.`,
    unresolvedReason: (n) => n ? `The server offered ${n} candidate(s), but none was selected with sufficient grounds.` : "The server found no admissible leaf candidate.",
    time: (p, iso) => `Time: precision ${p}; normalized time ${iso}.`,
    noFacts: (n) => `Observation ${n}: no explicit parameter facts were confirmed.`,
    fact: (n, v, s) => `Fact ${n}: ${v}. Status: ${s}.`,
    factReason: "The fact is based only on explicit user evidence and parameters allowed for the selected object.",
    meaning: (t, s) => `Additional semantic projection: ${t}. Epistemic status: ${s}.`,
    meaningReason: "This is a secondary meaning and does not replace the primary Value/Observation Object.",
    safety: (c, r, cost, cap) => `Operation safety: provider calls ${c}; automatic retries ${r}; cost ${cost}; hard cap ${cap}.`,
    finished: "Analysis completed. Activities and admissible facts are persisted by guarded server steps; unresolved items remain unresolved.",
    unknown: "not specified",
  },
  pl: {
    received: (t) => `Otrzymano wiadomość: „${t}”`,
    started: (m, tier) => `Uruchomiono analizę Global Reality. Model: ${m}; poziom: ${tier}.`,
    observation: (n, t) => `Obserwacja ${n}: tekst aktywności to „${t}”.`,
    candidates: (n, names) => `Kontrola obiektu wartości/obserwacji: serwer zwrócił ${n} dozwolonych kandydatów${names ? `: ${names}` : "."}`,
    selected: (n, c) => `Wybór modelu: „${n}”. Pewność modelu w dozwolonym zbiorze kandydatów: ${c}.`,
    selectedReason: (n, c) => `Model wybierał wyłącznie spośród ${n} kandydatów serwera. Jego własna pewność wyboru wyniosła ${c}.`,
    unresolved: (t) => `Dla „${t}” nie wybrano liściowego obiektu wartości/obserwacji. Wynik pozostaje nierozstrzygnięty zamiast tworzyć wymyślony obiekt.`,
    unresolvedReason: (n) => n ? `Serwer zaproponował ${n} kandydatów, ale żaden nie został wybrany z wystarczającym uzasadnieniem.` : "Serwer nie znalazł dopuszczalnego kandydata liściowego.",
    time: (p, iso) => `Czas: dokładność ${p}; czas znormalizowany ${iso}.`,
    noFacts: (n) => `Obserwacja ${n}: nie potwierdzono jawnych faktów parametrów.`,
    fact: (n, v, s) => `Fakt ${n}: ${v}. Status: ${s}.`,
    factReason: "Fakt opiera się wyłącznie na jawnych danych użytkownika i parametrach dozwolonych dla wybranego obiektu.",
    meaning: (t, s) => `Dodatkowa projekcja znaczeniowa: ${t}. Status epistemiczny: ${s}.`,
    meaningReason: "To znaczenie wtórne i nie zastępuje głównego obiektu wartości/obserwacji.",
    safety: (c, r, cost, cap) => `Bezpieczeństwo operacji: wywołania modelu ${c}; automatyczne ponowienia ${r}; koszt ${cost}; twardy limit ${cap}.`,
    finished: "Analiza zakończona. Aktywności i dopuszczalne fakty są zapisywane przez chronione kroki serwera; nierozstrzygnięte elementy pozostają nierozstrzygnięte.",
    unknown: "nie podano",
  },
  ru: {
    received: (t) => `Получено сообщение: «${t}»`, started: (m,t) => `Запущен анализ Global Reality. Модель: ${m}; уровень: ${t}.`, observation: (n,t) => `Наблюдение ${n}: текст активности «${t}».`, candidates: (n,names) => `Проверка ЦО/ОН: сервер вернул ${n} допустимых кандидатов${names ? `: ${names}` : "."}`, selected: (n,c) => `Выбор модели: «${n}». Уверенность внутри разрешённого набора: ${c}.`, selectedReason: (n,c) => `Модель выбирала только из ${n} серверных кандидатов. Её уверенность: ${c}.`, unresolved: (t) => `Для «${t}» листовой ЦО/ОН не выбран. Результат остаётся неопределённым, а не заменяется выдуманным объектом.`, unresolvedReason: (n) => n ? `Сервер предложил ${n} кандидатов, но достаточного основания для выбора не было.` : "Сервер не нашёл допустимого листового кандидата.", time: (p,i) => `Время: точность ${p}; нормализованное время ${i}.`, noFacts: (n) => `Наблюдение ${n}: явные факты параметров не подтверждены.`, fact: (n,v,s) => `Факт ${n}: ${v}. Статус: ${s}.`, factReason: "Факт основан только на явных данных пользователя и разрешённых параметрах выбранного объекта.", meaning: (t,s) => `Дополнительная смысловая проекция: ${t}. Эпистемический статус: ${s}.`, meaningReason: "Это вторичный смысл и он не заменяет основной ЦО/ОН.", safety: (c,r,cost,cap) => `Безопасность операции: вызовов модели ${c}; автоповторов ${r}; стоимость ${cost}; жёсткий предел ${cap}.`, finished: "Анализ завершён. Активности и допустимые факты сохраняются защищёнными серверными шагами; неопределённости остаются неопределённостями.", unknown: "не указано",
  },
  uk: {
    received: (t) => `Отримано повідомлення: «${t}»`, started: (m,t) => `Запущено аналіз Global Reality. Модель: ${m}; рівень: ${t}.`, observation: (n,t) => `Спостереження ${n}: текст активності «${t}».`, candidates: (n,names) => `Перевірка ЦО/ОС: сервер повернув ${n} допустимих кандидатів${names ? `: ${names}` : "."}`, selected: (n,c) => `Вибір моделі: «${n}». Упевненість у дозволеному наборі: ${c}.`, selectedReason: (n,c) => `Модель обирала лише з ${n} серверних кандидатів. Її впевненість: ${c}.`, unresolved: (t) => `Для «${t}» листовий ЦО/ОС не вибрано. Результат залишається невизначеним без вигаданого об’єкта.`, unresolvedReason: (n) => n ? `Сервер запропонував ${n} кандидатів, але достатніх підстав для вибору не було.` : "Сервер не знайшов допустимого листового кандидата.", time: (p,i) => `Час: точність ${p}; нормалізований час ${i}.`, noFacts: (n) => `Спостереження ${n}: явні факти параметрів не підтверджено.`, fact: (n,v,s) => `Факт ${n}: ${v}. Статус: ${s}.`, factReason: "Факт ґрунтується лише на явних даних користувача та дозволених параметрах вибраного об’єкта.", meaning: (t,s) => `Додаткова смислова проєкція: ${t}. Епістемічний статус: ${s}.`, meaningReason: "Це вторинний зміст і він не замінює основний ЦО/ОС.", safety: (c,r,cost,cap) => `Безпека операції: викликів моделі ${c}; автоповторів ${r}; вартість ${cost}; жорстка межа ${cap}.`, finished: "Аналіз завершено. Активності й допустимі факти зберігаються захищеними серверними кроками; невизначені елементи залишаються невизначеними.", unknown: "не вказано",
  },
  de: {
    received: (t) => `Nachricht erhalten: „${t}“`, started: (m,t) => `Global-Reality-Analyse gestartet. Modell: ${m}; Stufe: ${t}.`, observation: (n,t) => `Beobachtung ${n}: Aktivitätstext „${t}“.`, candidates: (n,names) => `Prüfung der Wert-/Beobachtungsobjekte: Der Server lieferte ${n} zulässige Kandidaten${names ? `: ${names}` : "."}`, selected: (n,c) => `Modellauswahl: „${n}“. Modell-Sicherheit innerhalb der zulässigen Kandidaten: ${c}.`, selectedReason: (n,c) => `Das Modell wählte ausschließlich aus ${n} Serverkandidaten. Eigene Auswahlsicherheit: ${c}.`, unresolved: (t) => `Für „${t}“ wurde kein Blatt-Wert-/Beobachtungsobjekt gewählt. Das Ergebnis bleibt offen, statt ein Objekt zu erfinden.`, unresolvedReason: (n) => n ? `Der Server bot ${n} Kandidaten an, aber keiner hatte eine ausreichende Grundlage.` : "Der Server fand keinen zulässigen Blattkandidaten.", time: (p,i) => `Zeit: Genauigkeit ${p}; normalisierte Zeit ${i}.`, noFacts: (n) => `Beobachtung ${n}: keine expliziten Parameterfakten bestätigt.`, fact: (n,v,s) => `Fakt ${n}: ${v}. Status: ${s}.`, factReason: "Der Fakt basiert nur auf expliziten Nutzerdaten und zulässigen Parametern des gewählten Objekts.", meaning: (t,s) => `Zusätzliche semantische Projektion: ${t}. Epistemischer Status: ${s}.`, meaningReason: "Dies ist eine sekundäre Bedeutung und ersetzt das primäre Wert-/Beobachtungsobjekt nicht.", safety: (c,r,cost,cap) => `Operationssicherheit: Modellaufrufe ${c}; automatische Wiederholungen ${r}; Kosten ${cost}; harte Grenze ${cap}.`, finished: "Analyse abgeschlossen. Aktivitäten und zulässige Fakten werden durch geschützte Serverschritte gespeichert; offene Punkte bleiben offen.", unknown: "nicht angegeben",
  },
  es: {
    received: (t) => `Mensaje recibido: «${t}»`, started: (m,t) => `Análisis Global Reality iniciado. Modelo: ${m}; nivel: ${t}.`, observation: (n,t) => `Observación ${n}: texto de la actividad «${t}».`, candidates: (n,names) => `Comprobación de objetos de valor/observación: el servidor devolvió ${n} candidatos permitidos${names ? `: ${names}` : "."}`, selected: (n,c) => `Selección del modelo: «${n}». Confianza del modelo dentro del conjunto permitido: ${c}.`, selectedReason: (n,c) => `El modelo eligió solo entre ${n} candidatos del servidor. Su confianza fue ${c}.`, unresolved: (t) => `Para «${t}» no se seleccionó ningún objeto hoja de valor/observación. El resultado queda sin resolver en lugar de inventar un objeto.`, unresolvedReason: (n) => n ? `El servidor ofreció ${n} candidatos, pero ninguno tuvo fundamento suficiente.` : "El servidor no encontró un candidato hoja admisible.", time: (p,i) => `Tiempo: precisión ${p}; tiempo normalizado ${i}.`, noFacts: (n) => `Observación ${n}: no se confirmaron hechos explícitos de parámetros.`, fact: (n,v,s) => `Hecho ${n}: ${v}. Estado: ${s}.`, factReason: "El hecho se basa solo en datos explícitos del usuario y parámetros permitidos para el objeto seleccionado.", meaning: (t,s) => `Proyección semántica adicional: ${t}. Estado epistémico: ${s}.`, meaningReason: "Es un significado secundario y no sustituye al objeto principal de valor/observación.", safety: (c,r,cost,cap) => `Seguridad de la operación: llamadas al modelo ${c}; reintentos automáticos ${r}; coste ${cost}; límite estricto ${cap}.`, finished: "Análisis completado. Las actividades y hechos admisibles se guardan mediante pasos protegidos del servidor; lo no resuelto permanece sin resolver.", unknown: "no indicado",
  },
  cs: {
    received: (t) => `Přijata zpráva: „${t}“`, started: (m,t) => `Spuštěna analýza Global Reality. Model: ${m}; úroveň: ${t}.`, observation: (n,t) => `Pozorování ${n}: text aktivity „${t}“.`, candidates: (n,names) => `Kontrola hodnotových/pozorovacích objektů: server vrátil ${n} povolených kandidátů${names ? `: ${names}` : "."}`, selected: (n,c) => `Volba modelu: „${n}“. Jistota modelu v povolené sadě: ${c}.`, selectedReason: (n,c) => `Model vybíral pouze z ${n} kandidátů serveru. Jeho jistota byla ${c}.`, unresolved: (t) => `Pro „${t}“ nebyl vybrán listový hodnotový/pozorovací objekt. Výsledek zůstává neurčený bez vymyšleného objektu.`, unresolvedReason: (n) => n ? `Server nabídl ${n} kandidátů, ale žádný neměl dostatečný podklad.` : "Server nenašel přípustného listového kandidáta.", time: (p,i) => `Čas: přesnost ${p}; normalizovaný čas ${i}.`, noFacts: (n) => `Pozorování ${n}: nebyla potvrzena žádná výslovná fakta parametrů.`, fact: (n,v,s) => `Fakt ${n}: ${v}. Stav: ${s}.`, factReason: "Fakt vychází pouze z výslovných údajů uživatele a povolených parametrů vybraného objektu.", meaning: (t,s) => `Doplňková významová projekce: ${t}. Epistemický stav: ${s}.`, meaningReason: "Jde o sekundární význam a nenahrazuje hlavní hodnotový/pozorovací objekt.", safety: (c,r,cost,cap) => `Bezpečnost operace: volání modelu ${c}; automatické opakování ${r}; náklady ${cost}; pevný limit ${cap}.`, finished: "Analýza dokončena. Aktivity a přípustná fakta se ukládají chráněnými kroky serveru; neurčené položky zůstávají neurčené.", unknown: "neuvedeno",
  },
};

function localizedVoTitle(candidate: Candidate, locale: AiLabUiLocale) {
  return localizeGlobalSystemValueObject(
    { canonical_key: candidate.canonicalKey ?? null, title: candidate.title ?? null },
    locale,
  ).title ?? candidate.title ?? candidate.canonicalKey ?? C[locale].unknown;
}

function confidence(value: unknown, unknownLabel: string) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value * 100)}%`
    : unknownLabel;
}

const STATUS_LABELS: Record<AiLabUiLocale, Record<string, string>> = {
  en: { proposed: "proposed", confirmed: "confirmed", rejected: "rejected", OBSERVED: "observed", DECLARED: "declared", DERIVED: "derived", INFERRED: "inferred", MODEL_HYPOTHESIS: "model hypothesis", unknown: "unknown" },
  pl: { proposed: "proponowany", confirmed: "potwierdzony", rejected: "odrzucony", OBSERVED: "zaobserwowany", DECLARED: "jawnie podany", DERIVED: "wyprowadzony", INFERRED: "wnioskowany", MODEL_HYPOTHESIS: "hipoteza modelu", unknown: "nieznany" },
  ru: { proposed: "предложен", confirmed: "подтверждён", rejected: "отклонён", OBSERVED: "наблюдаемый", DECLARED: "явно сообщён", DERIVED: "выведен", INFERRED: "предположен", MODEL_HYPOTHESIS: "гипотеза модели", unknown: "неизвестен" },
  uk: { proposed: "запропонований", confirmed: "підтверджений", rejected: "відхилений", OBSERVED: "спостережуваний", DECLARED: "явно повідомлений", DERIVED: "виведений", INFERRED: "припущений", MODEL_HYPOTHESIS: "гіпотеза моделі", unknown: "невідомий" },
  de: { proposed: "vorgeschlagen", confirmed: "bestätigt", rejected: "abgelehnt", OBSERVED: "beobachtet", DECLARED: "explizit angegeben", DERIVED: "abgeleitet", INFERRED: "erschlossen", MODEL_HYPOTHESIS: "Modellhypothese", unknown: "unbekannt" },
  es: { proposed: "propuesto", confirmed: "confirmado", rejected: "rechazado", OBSERVED: "observado", DECLARED: "declarado", DERIVED: "derivado", INFERRED: "inferido", MODEL_HYPOTHESIS: "hipótesis del modelo", unknown: "desconocido" },
  cs: { proposed: "navržený", confirmed: "potvrzený", rejected: "odmítnutý", OBSERVED: "pozorovaný", DECLARED: "výslovně uvedený", DERIVED: "odvozený", INFERRED: "usuzovaný", MODEL_HYPOTHESIS: "hypotéza modelu", unknown: "neznámý" },
};

const PRECISION_LABELS: Record<AiLabUiLocale, Record<string, string>> = {
  en: { exact: "exact", approximate: "approximate", date_only: "date only", window_only: "time window", unknown: "unknown" },
  pl: { exact: "dokładna", approximate: "przybliżona", date_only: "tylko data", window_only: "przedział czasu", unknown: "nieznana" },
  ru: { exact: "точная", approximate: "приблизительная", date_only: "только дата", window_only: "временное окно", unknown: "неизвестная" },
  uk: { exact: "точна", approximate: "приблизна", date_only: "лише дата", window_only: "часове вікно", unknown: "невідома" },
  de: { exact: "exakt", approximate: "ungefähr", date_only: "nur Datum", window_only: "Zeitfenster", unknown: "unbekannt" },
  es: { exact: "exacta", approximate: "aproximada", date_only: "solo fecha", window_only: "intervalo temporal", unknown: "desconocida" },
  cs: { exact: "přesná", approximate: "přibližná", date_only: "pouze datum", window_only: "časové okno", unknown: "neznámá" },
};

const UNIT_LABELS: Record<AiLabUiLocale, Record<string, string>> = {
  en: { minute: "min", minutes: "min", hour: "h", hours: "h", second: "s", seconds: "s", kilometer: "km", kilometers: "km", metre: "m", meter: "m", kilogram: "kg", repetition: "repetitions", repetitions: "repetitions" },
  pl: { minute: "min", minutes: "min", hour: "godz.", hours: "godz.", second: "s", seconds: "s", kilometer: "km", kilometers: "km", metre: "m", meter: "m", kilogram: "kg", repetition: "powt.", repetitions: "powt." },
  ru: { minute: "мин", minutes: "мин", hour: "ч", hours: "ч", second: "с", seconds: "с", kilometer: "км", kilometers: "км", metre: "м", meter: "м", kilogram: "кг", repetition: "повт.", repetitions: "повт." },
  uk: { minute: "хв", minutes: "хв", hour: "год", hours: "год", second: "с", seconds: "с", kilometer: "км", kilometers: "км", metre: "м", meter: "м", kilogram: "кг", repetition: "повт.", repetitions: "повт." },
  de: { minute: "Min.", minutes: "Min.", hour: "Std.", hours: "Std.", second: "Sek.", seconds: "Sek.", kilometer: "km", kilometers: "km", metre: "m", meter: "m", kilogram: "kg", repetition: "Wdh.", repetitions: "Wdh." },
  es: { minute: "min", minutes: "min", hour: "h", hours: "h", second: "s", seconds: "s", kilometer: "km", kilometers: "km", metre: "m", meter: "m", kilogram: "kg", repetition: "rep.", repetitions: "rep." },
  cs: { minute: "min", minutes: "min", hour: "h", hours: "h", second: "s", seconds: "s", kilometer: "km", kilometers: "km", metre: "m", meter: "m", kilogram: "kg", repetition: "opak.", repetitions: "opak." },
};

function localizeStatusCode(value: string, locale: AiLabUiLocale) {
  return STATUS_LABELS[locale][value] ?? STATUS_LABELS[locale].unknown;
}

function localizePrecisionCode(value: string, locale: AiLabUiLocale) {
  return PRECISION_LABELS[locale][value] ?? PRECISION_LABELS[locale].unknown;
}

function localizedFactValue(fact: NonNullable<NonNullable<Preview["rows"]>[number]["facts"]>[number], locale: AiLabUiLocale) {
  const unit = fact.unit ? (UNIT_LABELS[locale][fact.unit] ?? fact.unit) : "";
  if (typeof fact.valueNumeric === "number") return `${fact.valueNumeric}${unit ? ` ${unit}` : ""}`;
  if (typeof fact.valueText === "string") return `${fact.valueText}${unit ? ` ${unit}` : ""}`;
  if (typeof fact.valueBoolean === "boolean") return `${fact.valueBoolean}${unit ? ` ${unit}` : ""}`;
  return "—";
}

export function buildLocalizedAiLabTrace(input: {
  inputText: string;
  payload: Preview;
  locale: AiLabUiLocale;
}): LocalizedAiLabTraceLine[] {
  const copy = C[input.locale];
  const rows = input.payload.rows ?? [];
  const groups = new Map(
    (input.payload.analysisTrace?.candidateGroups ?? []).map((group) => [group.segmentId ?? "", group]),
  );
  const lines: LocalizedAiLabTraceLine[] = [
    { kind: "system", text: copy.received(input.inputText) },
    { kind: "system", text: copy.started(input.payload.model ?? copy.unknown, input.payload.modelTier ?? copy.unknown) },
  ];

  rows.forEach((row, index) => {
    const segmentId = row.segmentId ?? `segment-${index + 1}`;
    const group = groups.get(row.segmentId ?? "");
    const candidates = group?.candidates ?? [];
    const names = candidates.map((candidate) => `“${localizedVoTitle(candidate, input.locale)}”`).join("; ");
    lines.push({ kind: "model", text: copy.observation(index + 1, input.inputText) });
    lines.push({ kind: "check", text: copy.candidates(candidates.length, names) });

    if (row.selected) {
      const selectedTitle = localizedVoTitle(row.selected, input.locale);
      const selectedConfidence = confidence(row.confidence, copy.unknown);
      lines.push({
        kind: "model",
        text: copy.selected(selectedTitle, selectedConfidence),
        feedback: {
          targetKind: "primary_selection",
          targetKey: `segment:${segmentId}:primary_selection`,
          targetValueObjectId: row.selected.valueObjectId ?? null,
          sourceContractCode: input.payload.contractVersion ?? null,
          proposalSnapshot: {
            segmentId,
            selected: {
              valueObjectId: row.selected.valueObjectId ?? null,
              canonicalKey: row.selected.canonicalKey ?? null,
              title: selectedTitle,
              semanticMatchMethodCode: row.selected.semanticMatchMethodCode ?? null,
            },
            confidence: row.confidence ?? null,
            candidates: candidates.map((candidate) => ({
              valueObjectId: candidate.valueObjectId ?? null,
              canonicalKey: candidate.canonicalKey ?? null,
              title: localizedVoTitle(candidate, input.locale),
            })),
          },
          rationale: copy.selectedReason(candidates.length, selectedConfidence),
        },
      });
    } else {
      lines.push({
        kind: "unresolved",
        text: copy.unresolved(input.inputText),
        feedback: {
          targetKind: "unresolved",
          targetKey: `segment:${segmentId}:unresolved`,
          targetValueObjectId: null,
          sourceContractCode: input.payload.contractVersion ?? null,
          proposalSnapshot: {
            segmentId,
            candidates: candidates.map((candidate) => ({
              valueObjectId: candidate.valueObjectId ?? null,
              canonicalKey: candidate.canonicalKey ?? null,
              title: localizedVoTitle(candidate, input.locale),
            })),
          },
          rationale: copy.unresolvedReason(candidates.length),
        },
      });
    }

    if (row.temporal?.occurredAtIso || row.temporal?.temporalPrecision) {
      lines.push({
        kind: "check",
        text: copy.time(
          localizePrecisionCode(row.temporal.temporalPrecision ?? "unknown", input.locale),
          row.temporal.occurredAtIso ?? copy.unknown,
        ),
      });
    }

    const facts = row.facts ?? [];
    if (facts.length === 0) lines.push({ kind: "check", text: copy.noFacts(index + 1) });
    facts.forEach((fact, factIndex) => {
      const parameter = fact.parameterCode ?? `fact_${factIndex + 1}`;
      lines.push({
        kind: "fact",
        text: copy.fact(factIndex + 1, localizedFactValue(fact, input.locale), localizeStatusCode(fact.factStatus ?? "proposed", input.locale)),
        feedback: {
          targetKind: "fact",
          targetKey: `segment:${segmentId}:fact:${parameter}:${factIndex + 1}`,
          targetValueObjectId: row.selected?.valueObjectId ?? null,
          sourceContractCode: input.payload.contractVersion ?? null,
          proposalSnapshot: {
            segmentId,
            parameterCode: fact.parameterCode ?? null,
            unit: fact.unit ?? null,
            valueNumeric: fact.valueNumeric ?? null,
            valueText: fact.valueText ?? null,
            valueBoolean: fact.valueBoolean ?? null,
            factStatus: fact.factStatus ?? "proposed",
          },
          rationale: copy.factReason,
        },
      });
    });

    (row.semanticProjections ?? []).forEach((projection, projectionIndex) => {
      const target = localizeGlobalSystemValueObject(
        { canonical_key: projection.targetCanonicalKey ?? null, title: projection.targetTitle ?? null },
        input.locale,
      ).title ?? projection.targetTitle ?? projection.targetCanonicalKey ?? copy.unknown;
      const code = projection.projectionCode ?? `projection_${projectionIndex + 1}`;
      lines.push({
        kind: "meaning",
        text: copy.meaning(target, localizeStatusCode(projection.epistemicStatus ?? "unknown", input.locale)),
        feedback: {
          targetKind: "semantic_projection",
          targetKey: `segment:${segmentId}:projection:${code}`,
          targetValueObjectId: projection.targetValueObjectId ?? null,
          sourceContractCode: projection.contractVersion ?? input.payload.contractVersion ?? null,
          proposalSnapshot: {
            segmentId,
            projectionCode: projection.projectionCode ?? null,
            targetCanonicalKey: projection.targetCanonicalKey ?? null,
            targetValueObjectId: projection.targetValueObjectId ?? null,
            targetTitle: target,
            epistemicStatus: projection.epistemicStatus ?? null,
            writeAllowed: projection.writeAllowed ?? null,
          },
          rationale: copy.meaningReason,
        },
      });
    });
  });

  const safety = input.payload.safety;
  if (safety) {
    lines.push({
      kind: "check",
      text: copy.safety(
        safety.providerCallsUsed ?? 0,
        safety.automaticProviderRetries ?? 0,
        typeof safety.actualProviderCostUsd === "number" ? `$${safety.actualProviderCostUsd.toFixed(6)}` : copy.unknown,
        typeof safety.hardCapUsd === "number" ? `$${safety.hardCapUsd}` : copy.unknown,
      ),
    });
  }
  lines.push({ kind: "system", text: copy.finished });
  return lines;
}
