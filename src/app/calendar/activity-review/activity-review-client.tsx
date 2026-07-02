"use client";

// CALENDAR_ADD_REVIEW_HIFI_STYLE_V1
// CALENDAR_ACTIVITY_REVIEW_STEP2_HIFI_V1
// NO_DB_WRITE_ACTIVITY_REVIEW

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type FieldStatus = "ready" | "candidate" | "missing";

const LOCALES: Locale[] = ["en", "pl", "ru", "uk", "de", "es", "cs"];

const UI = {
  "pl": {
    "back": "Wr\u00f3\u0107 do tekstu",
    "calendar": "Kalendarz",
    "step": "KROK 2 / SEMANTIC PREVIEW",
    "title": "Kontener aktywno\u015bci",
    "subtitle": "Activity Review Package jako osobna strona kalendarza. Ekran analizuje tekst, pokazuje pola i nie zapisuje danych.",
    "ready": "Gotowe",
    "candidate": "Kandydat",
    "missing": "Brak",
    "sourceText": "Tekst \u017ar\u00f3d\u0142owy",
    "activityTitle": "Tytu\u0142 aktywno\u015bci",
    "intent": "Intencja",
    "date": "Data",
    "time": "Czas",
    "duration": "Czas trwania",
    "categories": "Kategorie",
    "vo": "Kandydaci VO",
    "facts": "Podgl\u0105d fakt\u00f3w",
    "semanticTitle": "Semantic Preview",
    "semanticBody": "Ten ekran pokazuje ten sam typ kontenera co prawy AI Navigator, ale jako osobn\u0105 stron\u0119 kalendarza.",
    "redTitle": "Czerwone pola",
    "redBody": "Czerwone pola oznaczaj\u0105 funkcje jeszcze niezrealizowane, a nie b\u0142\u0105d.",
    "actions": "Dzia\u0142ania",
    "actionPlan": "Zaplanuj - nie zaimplementowano",
    "actionFact": "Zapisz jako fakt - nie zaimplementowano",
    "actionVo": "Po\u0142\u0105cz istniej\u0105cy VO - nie zaimplementowano",
    "empty": "Brak tekstu",
    "planned": "planned_activity",
    "runTitle": "Bieganie",
    "genericTitle": "Aktywno\u015b\u0107",
    "tomorrow": "Jutro",
    "morning": "Rano",
    "noTime": "Nie wykryto dok\u0142adnej godziny",
    "health": "Zdrowie",
    "movement": "Ruch",
    "endurance": "Wytrzyma\u0142o\u015b\u0107",
    "voBody": "Rzeczywisty lookup VO nie jest jeszcze pod\u0142\u0105czony.",
    "factDuration": "duration_minutes",
    "factStatus": "planned candidate"
  },
  "en": {
    "back": "Back to text",
    "calendar": "Calendar",
    "step": "STEP 2 / SEMANTIC PREVIEW",
    "title": "Activity container",
    "subtitle": "Activity Review Package as a separate calendar page. The screen analyzes text, shows fields and does not save data.",
    "ready": "Ready",
    "candidate": "Candidate",
    "missing": "Missing",
    "sourceText": "Source text",
    "activityTitle": "Activity title",
    "intent": "Intent",
    "date": "Date",
    "time": "Time",
    "duration": "Duration",
    "categories": "Categories",
    "vo": "VO candidates",
    "facts": "Fact preview",
    "semanticTitle": "Semantic Preview",
    "semanticBody": "This screen shows the same container type as the right AI Navigator, but as a separate calendar page.",
    "redTitle": "Red fields",
    "redBody": "Red fields mean not-yet-implemented functions, not an error.",
    "actions": "Actions",
    "actionPlan": "Schedule - not implemented",
    "actionFact": "Save as fact - not implemented",
    "actionVo": "Link existing VO - not implemented",
    "empty": "No text",
    "planned": "planned_activity",
    "runTitle": "Running",
    "genericTitle": "Activity",
    "tomorrow": "Tomorrow",
    "morning": "Morning",
    "noTime": "No exact time detected",
    "health": "Health",
    "movement": "Movement",
    "endurance": "Endurance",
    "voBody": "Real VO lookup is not connected yet.",
    "factDuration": "duration_minutes",
    "factStatus": "planned candidate"
  },
  "ru": {
    "back": "\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043a \u0442\u0435\u043a\u0441\u0442\u0443",
    "calendar": "\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c",
    "step": "\u0428\u0410\u0413 2 / SEMANTIC PREVIEW",
    "title": "\u041a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
    "subtitle": "Activity Review Package \u043a\u0430\u043a \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u0430\u044f \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044f. \u042d\u043a\u0440\u0430\u043d \u0430\u043d\u0430\u043b\u0438\u0437\u0438\u0440\u0443\u0435\u0442 \u0442\u0435\u043a\u0441\u0442, \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u043f\u043e\u043b\u044f \u0438 \u043d\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0435.",
    "ready": "\u0413\u043e\u0442\u043e\u0432\u043e",
    "candidate": "\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442",
    "missing": "\u041e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442",
    "sourceText": "\u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0439 \u0442\u0435\u043a\u0441\u0442",
    "activityTitle": "\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
    "intent": "\u041d\u0430\u043c\u0435\u0440\u0435\u043d\u0438\u0435",
    "date": "\u0414\u0430\u0442\u0430",
    "time": "\u0412\u0440\u0435\u043c\u044f",
    "duration": "\u0414\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c",
    "categories": "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438",
    "vo": "\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u044b VO",
    "facts": "\u041f\u0440\u0435\u0434\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u0444\u0430\u043a\u0442\u043e\u0432",
    "semanticTitle": "Semantic Preview",
    "semanticBody": "\u042d\u0442\u043e\u0442 \u044d\u043a\u0440\u0430\u043d \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u0442\u043e\u0442 \u0436\u0435 \u0442\u0438\u043f \u043a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440\u0430, \u0447\u0442\u043e \u0438 \u043f\u0440\u0430\u0432\u044b\u0439 AI Navigator, \u043d\u043e \u043a\u0430\u043a \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u0443\u044e \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044f.",
    "redTitle": "\u041a\u0440\u0430\u0441\u043d\u044b\u0435 \u043f\u043e\u043b\u044f",
    "redBody": "\u041a\u0440\u0430\u0441\u043d\u044b\u0435 \u043f\u043e\u043b\u044f \u043e\u0437\u043d\u0430\u0447\u0430\u044e\u0442 \u0435\u0449\u0451 \u043d\u0435 \u0440\u0435\u0430\u043b\u0438\u0437\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u0444\u0443\u043d\u043a\u0446\u0438\u0438, \u0430 \u043d\u0435 \u043e\u0448\u0438\u0431\u043a\u0443.",
    "actions": "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
    "actionPlan": "\u0417\u0430\u043f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u2014 \u043d\u0435 \u0440\u0435\u0430\u043b\u0438\u0437\u043e\u0432\u0430\u043d\u043e",
    "actionFact": "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043a\u0430\u043a \u0444\u0430\u043a\u0442 \u2014 \u043d\u0435 \u0440\u0435\u0430\u043b\u0438\u0437\u043e\u0432\u0430\u043d\u043e",
    "actionVo": "\u0421\u0432\u044f\u0437\u0430\u0442\u044c \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0439 VO \u2014 \u043d\u0435 \u0440\u0435\u0430\u043b\u0438\u0437\u043e\u0432\u0430\u043d\u043e",
    "empty": "\u0422\u0435\u043a\u0441\u0442\u0430 \u043d\u0435\u0442",
    "planned": "planned_activity",
    "runTitle": "\u041f\u0440\u043e\u0431\u0435\u0436\u043a\u0430",
    "genericTitle": "\u0410\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
    "tomorrow": "\u0417\u0430\u0432\u0442\u0440\u0430",
    "morning": "\u0423\u0442\u0440\u043e\u043c",
    "noTime": "\u0422\u043e\u0447\u043d\u043e\u0435 \u0432\u0440\u0435\u043c\u044f \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e",
    "health": "\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435",
    "movement": "\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435",
    "endurance": "\u0412\u044b\u043d\u043e\u0441\u043b\u0438\u0432\u043e\u0441\u0442\u044c",
    "voBody": "\u0420\u0435\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u043e\u0438\u0441\u043a VO \u0435\u0449\u0451 \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0451\u043d.",
    "factDuration": "duration_minutes",
    "factStatus": "planned candidate"
  },
  "uk": {
    "back": "\u041f\u043e\u0432\u0435\u0440\u043d\u0443\u0442\u0438\u0441\u044f \u0434\u043e \u0442\u0435\u043a\u0441\u0442\u0443",
    "calendar": "\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440",
    "step": "\u041a\u0420\u041e\u041a 2 / SEMANTIC PREVIEW",
    "title": "\u041a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0456",
    "subtitle": "Activity Review Package \u044f\u043a \u043e\u043a\u0440\u0435\u043c\u0430 \u0441\u0442\u043e\u0440\u0456\u043d\u043a\u0430 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044f. \u0415\u043a\u0440\u0430\u043d \u0430\u043d\u0430\u043b\u0456\u0437\u0443\u0454 \u0442\u0435\u043a\u0441\u0442, \u043f\u043e\u043a\u0430\u0437\u0443\u0454 \u043f\u043e\u043b\u044f \u0456 \u043d\u0435 \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454 \u0434\u0430\u043d\u0456.",
    "ready": "\u0413\u043e\u0442\u043e\u0432\u043e",
    "candidate": "\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442",
    "missing": "\u0412\u0456\u0434\u0441\u0443\u0442\u043d\u0454",
    "sourceText": "\u0412\u0438\u0445\u0456\u0434\u043d\u0438\u0439 \u0442\u0435\u043a\u0441\u0442",
    "activityTitle": "\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0456",
    "intent": "\u041d\u0430\u043c\u0456\u0440",
    "date": "\u0414\u0430\u0442\u0430",
    "time": "\u0427\u0430\u0441",
    "duration": "\u0422\u0440\u0438\u0432\u0430\u043b\u0456\u0441\u0442\u044c",
    "categories": "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457",
    "vo": "\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u0438 VO",
    "facts": "\u041f\u0435\u0440\u0435\u0434\u043f\u0435\u0440\u0435\u0433\u043b\u044f\u0434 \u0444\u0430\u043a\u0442\u0456\u0432",
    "semanticTitle": "Semantic Preview",
    "semanticBody": "\u0426\u0435\u0439 \u0435\u043a\u0440\u0430\u043d \u043f\u043e\u043a\u0430\u0437\u0443\u0454 \u0442\u043e\u0439 \u0441\u0430\u043c\u0438\u0439 \u0442\u0438\u043f \u043a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440\u0430, \u0449\u043e \u0439 \u043f\u0440\u0430\u0432\u0438\u0439 AI Navigator, \u0430\u043b\u0435 \u044f\u043a \u043e\u043a\u0440\u0435\u043c\u0443 \u0441\u0442\u043e\u0440\u0456\u043d\u043a\u0443 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044f.",
    "redTitle": "\u0427\u0435\u0440\u0432\u043e\u043d\u0456 \u043f\u043e\u043b\u044f",
    "redBody": "\u0427\u0435\u0440\u0432\u043e\u043d\u0456 \u043f\u043e\u043b\u044f \u043e\u0437\u043d\u0430\u0447\u0430\u044e\u0442\u044c \u0449\u0435 \u043d\u0435 \u0440\u0435\u0430\u043b\u0456\u0437\u043e\u0432\u0430\u043d\u0456 \u0444\u0443\u043d\u043a\u0446\u0456\u0457, \u0430 \u043d\u0435 \u043f\u043e\u043c\u0438\u043b\u043a\u0443.",
    "actions": "\u0414\u0456\u0457",
    "actionPlan": "\u0417\u0430\u043f\u043b\u0430\u043d\u0443\u0432\u0430\u0442\u0438 \u2014 \u043d\u0435 \u0440\u0435\u0430\u043b\u0456\u0437\u043e\u0432\u0430\u043d\u043e",
    "actionFact": "\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u044f\u043a \u0444\u0430\u043a\u0442 \u2014 \u043d\u0435 \u0440\u0435\u0430\u043b\u0456\u0437\u043e\u0432\u0430\u043d\u043e",
    "actionVo": "\u041f\u043e\u0432\u02bc\u044f\u0437\u0430\u0442\u0438 \u0456\u0441\u043d\u0443\u044e\u0447\u0438\u0439 VO \u2014 \u043d\u0435 \u0440\u0435\u0430\u043b\u0456\u0437\u043e\u0432\u0430\u043d\u043e",
    "empty": "\u0422\u0435\u043a\u0441\u0442\u0443 \u043d\u0435\u043c\u0430\u0454",
    "planned": "planned_activity",
    "runTitle": "\u041f\u0440\u043e\u0431\u0456\u0436\u043a\u0430",
    "genericTitle": "\u0410\u043a\u0442\u0438\u0432\u043d\u0456\u0441\u0442\u044c",
    "tomorrow": "\u0417\u0430\u0432\u0442\u0440\u0430",
    "morning": "\u0412\u0440\u0430\u043d\u0446\u0456",
    "noTime": "\u0422\u043e\u0447\u043d\u0438\u0439 \u0447\u0430\u0441 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e",
    "health": "\u0417\u0434\u043e\u0440\u043e\u0432\u02bc\u044f",
    "movement": "\u0420\u0443\u0445",
    "endurance": "\u0412\u0438\u0442\u0440\u0438\u0432\u0430\u043b\u0456\u0441\u0442\u044c",
    "voBody": "\u0420\u0435\u0430\u043b\u044c\u043d\u0438\u0439 \u043f\u043e\u0448\u0443\u043a VO \u0449\u0435 \u043d\u0435 \u043f\u0456\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u043e.",
    "factDuration": "duration_minutes",
    "factStatus": "planned candidate"
  },
  "de": {
    "back": "Zur\u00fcck zum Text",
    "calendar": "Kalender",
    "step": "SCHRITT 2 / SEMANTIC PREVIEW",
    "title": "Aktivit\u00e4tscontainer",
    "subtitle": "Activity Review Package als separate Kalenderseite. Der Bildschirm analysiert Text, zeigt Felder und speichert keine Daten.",
    "ready": "Bereit",
    "candidate": "Kandidat",
    "missing": "Fehlt",
    "sourceText": "Quelltext",
    "activityTitle": "Aktivit\u00e4tstitel",
    "intent": "Absicht",
    "date": "Datum",
    "time": "Zeit",
    "duration": "Dauer",
    "categories": "Kategorien",
    "vo": "VO-Kandidaten",
    "facts": "Faktenvorschau",
    "semanticTitle": "Semantic Preview",
    "semanticBody": "Dieser Bildschirm zeigt denselben Container-Typ wie der rechte AI Navigator, aber als separate Kalenderseite.",
    "redTitle": "Rote Felder",
    "redBody": "Rote Felder bedeuten noch nicht implementierte Funktionen, keinen Fehler.",
    "actions": "Aktionen",
    "actionPlan": "Planen - nicht implementiert",
    "actionFact": "Als Fakt speichern - nicht implementiert",
    "actionVo": "Bestehenden VO verkn\u00fcpfen - nicht implementiert",
    "empty": "Kein Text",
    "planned": "planned_activity",
    "runTitle": "Laufen",
    "genericTitle": "Aktivit\u00e4t",
    "tomorrow": "Morgen",
    "morning": "Morgens",
    "noTime": "Keine genaue Uhrzeit erkannt",
    "health": "Gesundheit",
    "movement": "Bewegung",
    "endurance": "Ausdauer",
    "voBody": "Echter VO-Lookup ist noch nicht verbunden.",
    "factDuration": "duration_minutes",
    "factStatus": "planned candidate"
  },
  "es": {
    "back": "Volver al texto",
    "calendar": "Calendario",
    "step": "PASO 2 / SEMANTIC PREVIEW",
    "title": "Contenedor de actividad",
    "subtitle": "Activity Review Package como p\u00e1gina separada del calendario. La pantalla analiza texto, muestra campos y no guarda datos.",
    "ready": "Listo",
    "candidate": "Candidato",
    "missing": "Falta",
    "sourceText": "Texto fuente",
    "activityTitle": "T\u00edtulo de actividad",
    "intent": "Intenci\u00f3n",
    "date": "Fecha",
    "time": "Hora",
    "duration": "Duraci\u00f3n",
    "categories": "Categor\u00edas",
    "vo": "Candidatos VO",
    "facts": "Vista previa de hechos",
    "semanticTitle": "Semantic Preview",
    "semanticBody": "Esta pantalla muestra el mismo tipo de contenedor que el AI Navigator derecho, pero como p\u00e1gina separada del calendario.",
    "redTitle": "Campos rojos",
    "redBody": "Los campos rojos significan funciones a\u00fan no implementadas, no un error.",
    "actions": "Acciones",
    "actionPlan": "Planificar - no implementado",
    "actionFact": "Guardar como hecho - no implementado",
    "actionVo": "Vincular VO existente - no implementado",
    "empty": "Sin texto",
    "planned": "planned_activity",
    "runTitle": "Correr",
    "genericTitle": "Actividad",
    "tomorrow": "Ma\u00f1ana",
    "morning": "Por la ma\u00f1ana",
    "noTime": "No se detect\u00f3 hora exacta",
    "health": "Salud",
    "movement": "Movimiento",
    "endurance": "Resistencia",
    "voBody": "La b\u00fasqueda real de VO a\u00fan no est\u00e1 conectada.",
    "factDuration": "duration_minutes",
    "factStatus": "planned candidate"
  },
  "cs": {
    "back": "Zp\u011bt k textu",
    "calendar": "Kalend\u00e1\u0159",
    "step": "KROK 2 / SEMANTIC PREVIEW",
    "title": "Kontejner aktivity",
    "subtitle": "Activity Review Package jako samostatn\u00e1 str\u00e1nka kalend\u00e1\u0159e. Obrazovka analyzuje text, ukazuje pole a neukl\u00e1d\u00e1 data.",
    "ready": "Hotovo",
    "candidate": "Kandid\u00e1t",
    "missing": "Chyb\u00ed",
    "sourceText": "Zdrojov\u00fd text",
    "activityTitle": "N\u00e1zev aktivity",
    "intent": "Z\u00e1m\u011br",
    "date": "Datum",
    "time": "\u010cas",
    "duration": "Trv\u00e1n\u00ed",
    "categories": "Kategorie",
    "vo": "VO kandid\u00e1ti",
    "facts": "N\u00e1hled fakt\u016f",
    "semanticTitle": "Semantic Preview",
    "semanticBody": "Tato obrazovka ukazuje stejn\u00fd typ kontejneru jako prav\u00fd AI Navigator, ale jako samostatnou str\u00e1nku kalend\u00e1\u0159e.",
    "redTitle": "\u010cerven\u00e1 pole",
    "redBody": "\u010cerven\u00e1 pole znamenaj\u00ed zat\u00edm neimplementovan\u00e9 funkce, ne chybu.",
    "actions": "Akce",
    "actionPlan": "Napl\u00e1novat - neimplementov\u00e1no",
    "actionFact": "Ulo\u017eit jako fakt - neimplementov\u00e1no",
    "actionVo": "Propojit existuj\u00edc\u00ed VO - neimplementov\u00e1no",
    "empty": "\u017d\u00e1dn\u00fd text",
    "planned": "planned_activity",
    "runTitle": "B\u011bh",
    "genericTitle": "Aktivita",
    "tomorrow": "Z\u00edtra",
    "morning": "R\u00e1no",
    "noTime": "Nebyl zji\u0161t\u011bn p\u0159esn\u00fd \u010das",
    "health": "Zdrav\u00ed",
    "movement": "Pohyb",
    "endurance": "Vytrvalost",
    "voBody": "Skute\u010dn\u00e9 vyhled\u00e1v\u00e1n\u00ed VO zat\u00edm nen\u00ed p\u0159ipojeno.",
    "factDuration": "duration_minutes",
    "factStatus": "planned candidate"
  }
} as const;

function normalizeLocale(value: string | null): Locale {
  if (value && LOCALES.includes(value as Locale)) {
    return value as Locale;
  }
  return "pl";
}

function hasAny(value: string, parts: string[]): boolean {
  return parts.some((part) => value.includes(part));
}

function extractDuration(raw: string): string | null {
  const match = raw.match(/(\d+)\s*(minut|minuty|minuta|min|minutes|minute|mins|Ð¼Ð¸Ð½ÑƒÑ‚|Ð¼Ð¸Ð½|Ñ…Ð²Ð¸Ð»Ð¸Ð½|Ñ…Ð²|minutos|minuten|Minuten)/i);
  if (!match) return null;
  return `${match[1]} min`;
}

function buildPreview(rawInput: string, locale: Locale) {
  const t = UI[locale];
  const raw = rawInput.trim();
  const lower = raw.toLowerCase();

  const runDetected = hasAny(lower, [
    "bieg", "pobieg", "biega", "run", "running", "jog", "laufen", "lauf", "correr", "corro",
    "Ð±ÐµÐ³", "Ð¿Ð¾Ð±ÐµÐ³", "Ð±ÐµÐ¶Ð°Ñ‚ÑŒ", "Ð±Ñ–Ð³", "Ð¿Ð¾Ð±Ñ–Ð³", "Ð±Ñ–Ð³Ð°Ñ‚Ð¸", "beh", "behat"
  ]);

  const tomorrowDetected = hasAny(lower, [
    "jutro", "tomorrow", "Ð·Ð°Ð²Ñ‚Ñ€Ð°", "morgen", "maÃ±ana", "manana", "zitra"
  ]);

  const morningDetected = hasAny(lower, [
    "rano", "morning", "ÑƒÑ‚Ñ€", "Ð²Ñ€Ð°Ð½", "morgens", "maÃ±ana", "manana"
  ]);

  const duration = extractDuration(raw);
  const title = runDetected ? t.runTitle : raw ? raw.slice(0, 44) : t.genericTitle;

  return [
    { label: t.sourceText, value: raw || t.empty, status: "ready" as FieldStatus, note: "calendar input" },
    { label: t.activityTitle, value: title, status: "ready" as FieldStatus, note: "local semantic title" },
    { label: t.intent, value: t.planned, status: "ready" as FieldStatus, note: "plan/fact route detected" },
    { label: t.date, value: tomorrowDetected ? t.tomorrow : t.empty, status: tomorrowDetected ? "ready" as FieldStatus : "candidate" as FieldStatus, note: "temporal marker" },
    { label: t.time, value: morningDetected ? t.morning : t.noTime, status: morningDetected ? "candidate" as FieldStatus : "missing" as FieldStatus, note: "time marker" },
    { label: t.duration, value: duration || t.empty, status: duration ? "ready" as FieldStatus : "candidate" as FieldStatus, note: "duration parser" },
    { label: t.categories, value: `${t.health} / ${t.movement} / ${t.endurance}`, status: "candidate" as FieldStatus, note: "semantic category candidates" },
    { label: t.vo, value: t.voBody, status: "missing" as FieldStatus, note: "real VO lookup is not connected" },
    { label: t.facts, value: duration ? `${t.factDuration} = ${duration} / ${t.factStatus}` : t.factStatus, status: "candidate" as FieldStatus, note: "preview only" },
  ];
}

function StatusBadge({ status, label }: { status: FieldStatus; label: string }) {
  const styles: Record<FieldStatus, string> = {
    ready: "border-[#86efac] bg-[#ecfdf5] text-[#047857]",
    candidate: "border-[#fde68a] bg-[#fffbeb] text-[#b45309]",
    missing: "border-[#fecaca] bg-[#fff1f2] text-[#be123c]",
  };

  return (
    <span className={`inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-extrabold uppercase tracking-[0.08em] ${styles[status]}`}>
      {label}
    </span>
  );
}

function FieldCard({ label, value, note, status, statusLabel }: { label: string; value: string; note: string; status: FieldStatus; statusLabel: string }) {
  const styles: Record<FieldStatus, string> = {
    ready: "border-[#86efac] bg-[#f0fdf4]",
    candidate: "border-[#fde68a] bg-[#fffbeb]",
    missing: "border-[#fecaca] bg-[#fff1f2]",
  };

  return (
    <div className={`rounded-[22px] border p-4 shadow-sm ${styles[status]}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#7c8099]">{label}</p>
        <StatusBadge status={status} label={statusLabel} />
      </div>
      <p className="break-words text-sm font-bold leading-6 text-[#1a1d2e]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#6f7893]">{note}</p>
    </div>
  );
}

export default function ActivityReviewClient() {
  const searchParams = useSearchParams();
  const locale = normalizeLocale(searchParams.get("locale"));
  const t = UI[locale];
  const rawText = searchParams.get("text") ?? "";

  const fields = useMemo(() => buildPreview(rawText, locale), [rawText, locale]);
  const readyCount = fields.filter((field) => field.status === "ready").length;
  const candidateCount = fields.filter((field) => field.status === "candidate").length;
  const missingCount = fields.filter((field) => field.status === "missing").length;

  const statusLabels: Record<FieldStatus, string> = {
    ready: t.ready,
    candidate: t.candidate,
    missing: t.missing,
  };

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#f0f2f7] px-4 py-6 text-[#1a1d2e] sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7 lg:p-8">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-8 flex flex-wrap gap-3">
                <Link
                  href={{ pathname: "/calendar/add", query: { locale } }}
                  className="inline-flex h-10 items-center rounded-full border border-[#dfe5f1] bg-white px-4 text-sm font-semibold text-[#52607a] shadow-sm transition hover:border-[#3b6ef8] hover:text-[#3b6ef8]"
                >
                  {t.back}
                </Link>
                <Link
                  href={{ pathname: "/calendar", query: { locale } }}
                  className="inline-flex h-10 items-center rounded-full border border-[#dfe5f1] bg-[#f7f9fd] px-4 text-sm font-semibold text-[#52607a] shadow-sm transition hover:border-[#3b6ef8] hover:text-[#3b6ef8]"
                >
                  {t.calendar}
                </Link>
              </div>
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.34em] text-[#3b6ef8]">
                {t.step}
              </p>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#1a1d2e] sm:text-4xl">
                {t.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6f7893]">
                {t.subtitle}
              </p>
            </div>
            <div className="rounded-full border border-[#dfe5f1] bg-[#f7f9fd] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7c8099]">
              preview-only
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-[#86efac] bg-[#ecfdf5] p-5 shadow-sm">
                <p className="text-3xl font-semibold text-[#047857]">{readyCount}</p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.22em] text-[#047857]">{t.ready}</p>
              </div>
              <div className="rounded-[24px] border border-[#fde68a] bg-[#fffbeb] p-5 shadow-sm">
                <p className="text-3xl font-semibold text-[#b45309]">{candidateCount}</p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.22em] text-[#b45309]">{t.candidate}</p>
              </div>
              <div className="rounded-[24px] border border-[#fecaca] bg-[#fff1f2] p-5 shadow-sm">
                <p className="text-3xl font-semibold text-[#be123c]">{missingCount}</p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.22em] text-[#be123c]">{t.missing}</p>
              </div>
            </div>

            <div className="grid gap-4">
              {fields.map((field) => (
                <FieldCard
                  key={field.label}
                  label={field.label}
                  value={field.value}
                  note={field.note}
                  status={field.status}
                  statusLabel={statusLabels[field.status]}
                />
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[24px] border border-[#b9c8ff] bg-[#eef2ff] p-5 shadow-sm">
              <p className="mb-2 text-sm font-bold text-[#1a1d2e]">{t.semanticTitle}</p>
              <p className="text-sm leading-6 text-[#52607a]">{t.semanticBody}</p>
            </div>

            <div className="rounded-[24px] border border-[#fecaca] bg-[#fff1f2] p-5 shadow-sm">
              <p className="mb-2 text-sm font-bold text-[#be123c]">{t.redTitle}</p>
              <p className="text-sm leading-6 text-[#9f1239]">{t.redBody}</p>
            </div>

            <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.24em] text-[#9ca3b8]">{t.actions}</p>
              <div className="space-y-3">
                {[t.actionPlan, t.actionFact, t.actionVo].map((label) => (
                  <button
                    key={label}
                    type="button"
                    disabled
                    className="w-full rounded-[18px] border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-left text-sm font-semibold text-[#be123c]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#dfe5f1] bg-[#f7f9fd] p-5 text-xs font-semibold leading-6 text-[#7c8099]">
              <span className="text-[#3b6ef8]">preview != write</span>
              <br />
              <span>candidate != saved fact</span>
              <br />
              <span>plan != fact</span>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

