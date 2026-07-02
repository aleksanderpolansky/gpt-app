"use client";

// CALENDAR_ADD_REVIEW_HIFI_STYLE_V1
// CALENDAR_ADD_ACTIVITY_STEP1_HIFI_V1
// NO_DB_WRITE_ACTIVITY_ADD

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Locale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

const LOCALES: Locale[] = ["en", "pl", "ru", "uk", "de", "es", "cs"];

const UI = {
  "pl": {
    "back": "Wr\u00f3\u0107 do kalendarza",
    "step": "KROK 1 / TEKST AKTYWNO\u015aCI",
    "title": "Tekst aktywno\u015bci",
    "subtitle": "Opisz planowan\u0105 lub wykonan\u0105 aktywno\u015b\u0107 jednym zdaniem. Ten ekran nie zapisuje danych.",
    "placeholder": "Np. jutro rano przez 30 minut pobiega\u0107",
    "helperTitle": "Jak to dzia\u0142a",
    "helperBody": "Po klikni\u0119ciu Dodaj otworzy si\u0119 Kontener aktywno\u015bci z podgl\u0105dem semantic preview.",
    "button": "Dodaj",
    "disabled": "Wpisz tekst, aby przej\u015b\u0107 dalej",
    "note1": "Bez zapisu do bazy",
    "note2": "Bez tworzenia fakt\u00f3w",
    "note3": "Bez tworzenia obiekt\u00f3w VO",
    "rightTitle": "Nast\u0119pny krok",
    "rightBody": "Zobaczysz pola gotowe, kandydackie i brakuj\u0105ce. Zapis planu i faktu pozostaje wy\u0142\u0105czony do osobnego gate."
  },
  "en": {
    "back": "Back to calendar",
    "step": "STEP 1 / ACTIVITY TEXT",
    "title": "Activity text",
    "subtitle": "Describe a planned or completed activity in one sentence. This screen does not save data.",
    "placeholder": "E.g. tomorrow morning run for 30 minutes",
    "helperTitle": "How it works",
    "helperBody": "After clicking Add, the Activity Container opens with a semantic preview.",
    "button": "Add",
    "disabled": "Enter text to continue",
    "note1": "No database write",
    "note2": "No fact creation",
    "note3": "No VO creation",
    "rightTitle": "Next step",
    "rightBody": "You will see ready, candidate and missing fields. Plan and fact saving stay disabled until a separate gate."
  },
  "ru": {
    "back": "\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043a \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044e",
    "step": "\u0428\u0410\u0413 1 / \u0422\u0415\u041a\u0421\u0422 \u0410\u041a\u0422\u0418\u0412\u041d\u041e\u0421\u0422\u0418",
    "title": "\u0422\u0435\u043a\u0441\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
    "subtitle": "\u041e\u043f\u0438\u0448\u0438\u0442\u0435 \u043f\u043b\u0430\u043d\u0438\u0440\u0443\u0435\u043c\u0443\u044e \u0438\u043b\u0438 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043d\u0443\u044e \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c \u043e\u0434\u043d\u043e\u0439 \u0444\u0440\u0430\u0437\u043e\u0439. \u042d\u0442\u043e\u0442 \u044d\u043a\u0440\u0430\u043d \u043d\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0435.",
    "placeholder": "\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: \u0437\u0430\u0432\u0442\u0440\u0430 \u0443\u0442\u0440\u043e\u043c \u043f\u043e\u0431\u0435\u0433\u0430\u0442\u044c 30 \u043c\u0438\u043d\u0443\u0442",
    "helperTitle": "\u041a\u0430\u043a \u044d\u0442\u043e \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442",
    "helperBody": "\u041f\u043e\u0441\u043b\u0435 \u043d\u0430\u0436\u0430\u0442\u0438\u044f \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u041a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438 \u0441 semantic preview.",
    "button": "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
    "disabled": "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043a\u0441\u0442, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c",
    "note1": "\u0411\u0435\u0437 \u0437\u0430\u043f\u0438\u0441\u0438 \u0432 \u0431\u0430\u0437\u0443",
    "note2": "\u0411\u0435\u0437 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f \u0444\u0430\u043a\u0442\u043e\u0432",
    "note3": "\u0411\u0435\u0437 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f VO",
    "rightTitle": "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0448\u0430\u0433",
    "rightBody": "\u0412\u044b \u0443\u0432\u0438\u0434\u0438\u0442\u0435 \u0433\u043e\u0442\u043e\u0432\u044b\u0435, \u043a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u043d\u044b\u0435 \u0438 \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0435 \u043f\u043e\u043b\u044f. \u0417\u0430\u043f\u0438\u0441\u044c \u043f\u043b\u0430\u043d\u0430 \u0438 \u0444\u0430\u043a\u0442\u0430 \u043e\u0441\u0442\u0430\u0451\u0442\u0441\u044f \u0432\u044b\u043a\u043b\u044e\u0447\u0435\u043d\u043d\u043e\u0439 \u0434\u043e \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e\u0433\u043e gate."
  },
  "uk": {
    "back": "\u041f\u043e\u0432\u0435\u0440\u043d\u0443\u0442\u0438\u0441\u044f \u0434\u043e \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044f",
    "step": "\u041a\u0420\u041e\u041a 1 / \u0422\u0415\u041a\u0421\u0422 \u0410\u041a\u0422\u0418\u0412\u041d\u041e\u0421\u0422\u0406",
    "title": "\u0422\u0435\u043a\u0441\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0456",
    "subtitle": "\u041e\u043f\u0438\u0448\u0456\u0442\u044c \u0437\u0430\u043f\u043b\u0430\u043d\u043e\u0432\u0430\u043d\u0443 \u0430\u0431\u043e \u0432\u0438\u043a\u043e\u043d\u0430\u043d\u0443 \u0430\u043a\u0442\u0438\u0432\u043d\u0456\u0441\u0442\u044c \u043e\u0434\u043d\u0456\u0454\u044e \u0444\u0440\u0430\u0437\u043e\u044e. \u0426\u0435\u0439 \u0435\u043a\u0440\u0430\u043d \u043d\u0435 \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454 \u0434\u0430\u043d\u0456.",
    "placeholder": "\u041d\u0430\u043f\u0440\u0438\u043a\u043b\u0430\u0434: \u0437\u0430\u0432\u0442\u0440\u0430 \u0432\u0440\u0430\u043d\u0446\u0456 \u043f\u043e\u0431\u0456\u0433\u0430\u0442\u0438 30 \u0445\u0432\u0438\u043b\u0438\u043d",
    "helperTitle": "\u042f\u043a \u0446\u0435 \u043f\u0440\u0430\u0446\u044e\u0454",
    "helperBody": "\u041f\u0456\u0441\u043b\u044f \u043d\u0430\u0442\u0438\u0441\u043a\u0430\u043d\u043d\u044f \u0414\u043e\u0434\u0430\u0442\u0438 \u0432\u0456\u0434\u043a\u0440\u0438\u0454\u0442\u044c\u0441\u044f \u041a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0456 \u0437 semantic preview.",
    "button": "\u0414\u043e\u0434\u0430\u0442\u0438",
    "disabled": "\u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0442\u0435\u043a\u0441\u0442, \u0449\u043e\u0431 \u043f\u0440\u043e\u0434\u043e\u0432\u0436\u0438\u0442\u0438",
    "note1": "\u0411\u0435\u0437 \u0437\u0430\u043f\u0438\u0441\u0443 \u0432 \u0431\u0430\u0437\u0443",
    "note2": "\u0411\u0435\u0437 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043d\u044f \u0444\u0430\u043a\u0442\u0456\u0432",
    "note3": "\u0411\u0435\u0437 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043d\u044f VO",
    "rightTitle": "\u041d\u0430\u0441\u0442\u0443\u043f\u043d\u0438\u0439 \u043a\u0440\u043e\u043a",
    "rightBody": "\u0412\u0438 \u043f\u043e\u0431\u0430\u0447\u0438\u0442\u0435 \u0433\u043e\u0442\u043e\u0432\u0456, \u043a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u043d\u0456 \u0442\u0430 \u0432\u0456\u0434\u0441\u0443\u0442\u043d\u0456 \u043f\u043e\u043b\u044f. \u0417\u0430\u043f\u0438\u0441 \u043f\u043b\u0430\u043d\u0443 \u0456 \u0444\u0430\u043a\u0442\u0443 \u0437\u0430\u043b\u0438\u0448\u0430\u0454\u0442\u044c\u0441\u044f \u0432\u0438\u043c\u043a\u043d\u0435\u043d\u0438\u043c \u0434\u043e \u043e\u043a\u0440\u0435\u043c\u043e\u0433\u043e gate."
  },
  "de": {
    "back": "Zur\u00fcck zum Kalender",
    "step": "SCHRITT 1 / AKTIVIT\u00c4TSTEXT",
    "title": "Aktivit\u00e4tstext",
    "subtitle": "Beschreibe eine geplante oder erledigte Aktivit\u00e4t in einem Satz. Dieser Bildschirm speichert keine Daten.",
    "placeholder": "Z. B. morgen fr\u00fch 30 Minuten laufen",
    "helperTitle": "So funktioniert es",
    "helperBody": "Nach dem Klick auf Hinzuf\u00fcgen \u00f6ffnet sich der Aktivit\u00e4tscontainer mit Semantic Preview.",
    "button": "Hinzuf\u00fcgen",
    "disabled": "Text eingeben, um fortzufahren",
    "note1": "Kein Datenbank-Write",
    "note2": "Keine Faktenerstellung",
    "note3": "Keine VO-Erstellung",
    "rightTitle": "N\u00e4chster Schritt",
    "rightBody": "Du siehst fertige, Kandidaten- und fehlende Felder. Plan- und Faktenspeicherung bleiben bis zu einem separaten Gate deaktiviert."
  },
  "es": {
    "back": "Volver al calendario",
    "step": "PASO 1 / TEXTO DE ACTIVIDAD",
    "title": "Texto de actividad",
    "subtitle": "Describe una actividad planificada o realizada en una frase. Esta pantalla no guarda datos.",
    "placeholder": "Ej. ma\u00f1ana por la ma\u00f1ana correr 30 minutos",
    "helperTitle": "C\u00f3mo funciona",
    "helperBody": "Despu\u00e9s de pulsar A\u00f1adir se abre el Contenedor de actividad con semantic preview.",
    "button": "A\u00f1adir",
    "disabled": "Escribe un texto para continuar",
    "note1": "Sin escritura en base de datos",
    "note2": "Sin crear hechos",
    "note3": "Sin crear VO",
    "rightTitle": "Siguiente paso",
    "rightBody": "Ver\u00e1s campos listos, candidatos y faltantes. Guardar plan o hecho sigue desactivado hasta un gate separado."
  },
  "cs": {
    "back": "Zp\u011bt do kalend\u00e1\u0159e",
    "step": "KROK 1 / TEXT AKTIVITY",
    "title": "Text aktivity",
    "subtitle": "Popi\u0161 pl\u00e1novanou nebo dokon\u010denou aktivitu jednou v\u011btou. Tato obrazovka neukl\u00e1d\u00e1 data.",
    "placeholder": "Nap\u0159. z\u00edtra r\u00e1no b\u011bhat 30 minut",
    "helperTitle": "Jak to funguje",
    "helperBody": "Po kliknut\u00ed na P\u0159idat se otev\u0159e Kontejner aktivity se semantic preview.",
    "button": "P\u0159idat",
    "disabled": "Zadej text pro pokra\u010dov\u00e1n\u00ed",
    "note1": "Bez z\u00e1pisu do datab\u00e1ze",
    "note2": "Bez vytv\u00e1\u0159en\u00ed fakt\u016f",
    "note3": "Bez vytv\u00e1\u0159en\u00ed VO",
    "rightTitle": "Dal\u0161\u00ed krok",
    "rightBody": "Uvid\u00ed\u0161 hotov\u00e1, kandid\u00e1tn\u00ed a chyb\u011bj\u00edc\u00ed pole. Ulo\u017een\u00ed pl\u00e1nu a faktu z\u016fst\u00e1v\u00e1 vypnut\u00e9 do samostatn\u00e9ho gate."
  }
} as const;

function normalizeLocale(value: string | null): Locale {
  if (value && LOCALES.includes(value as Locale)) {
    return value as Locale;
  }
  return "pl";
}

export default function AddActivityClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = normalizeLocale(searchParams.get("locale"));
  const t = UI[locale];
  const [text, setText] = useState("");

  const canSubmit = text.trim().length > 0;
  const charCountLabel = useMemo(() => `${text.trim().length}`, [text]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    router.push(`/calendar/activity-review?locale=${locale}&text=${encodeURIComponent(text.trim())}`);
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#f0f2f7] px-4 py-6 text-[#1a1d2e] sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <div className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7 lg:p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <Link
              href={{ pathname: "/calendar", query: { locale } }}
              className="inline-flex h-10 items-center rounded-full border border-[#dfe5f1] bg-white px-4 text-sm font-semibold text-[#52607a] shadow-sm transition hover:border-[#3b6ef8] hover:text-[#3b6ef8]"
            >
              {t.back}
            </Link>
            <div className="rounded-full border border-[#dfe5f1] bg-[#f7f9fd] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7c8099]">
              preview-only
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <form onSubmit={onSubmit} className="min-w-0">
              <div className="mb-5">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.34em] text-[#3b6ef8]">
                  {t.step}
                </p>
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#1a1d2e] sm:text-4xl">
                  {t.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f7893]">
                  {t.subtitle}
                </p>
              </div>

              <div className="rounded-[24px] border border-[#dfe5f1] bg-[#f7f9fd] p-3 shadow-inner">
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={t.placeholder}
                  className="min-h-[230px] w-full resize-y rounded-[20px] border border-[#d5def3] bg-white px-5 py-4 text-base leading-7 text-[#1a1d2e] outline-none transition placeholder:text-[#a7afc2] focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                />
              </div>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#7c8099]">
                  <span className="rounded-full bg-[#eef2ff] px-3 py-2 text-[#3b6ef8]">{t.note1}</span>
                  <span className="rounded-full bg-white px-3 py-2 ring-1 ring-[#dfe5f1]">{t.note2}</span>
                  <span className="rounded-full bg-white px-3 py-2 ring-1 ring-[#dfe5f1]">{t.note3}</span>
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex h-12 items-center justify-center rounded-[18px] bg-[#3b6ef8] px-7 text-sm font-extrabold text-white shadow-lg shadow-[#3b6ef8]/25 transition hover:bg-[#315ee0] disabled:cursor-not-allowed disabled:bg-[#c7d0e6] disabled:shadow-none"
                  title={canSubmit ? t.button : t.disabled}
                >
                  {t.button}
                </button>
              </div>
            </form>

            <aside className="space-y-4">
              <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-sm">
                <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.24em] text-[#9ca3b8]">
                  {t.helperTitle}
                </p>
                <p className="text-sm leading-6 text-[#52607a]">{t.helperBody}</p>
              </div>
              <div className="rounded-[24px] border border-[#b9c8ff] bg-[#eef2ff] p-5 shadow-sm">
                <p className="mb-2 text-sm font-bold text-[#1a1d2e]">{t.rightTitle}</p>
                <p className="text-sm leading-6 text-[#52607a]">{t.rightBody}</p>
              </div>
              <div className="rounded-[24px] border border-[#dfe5f1] bg-[#f7f9fd] p-5 text-xs font-semibold text-[#7c8099]">
                <span className="text-[#3b6ef8]">preview != write</span>
                <span className="mx-2 text-[#c0c7d8]">/</span>
                <span>candidate != saved fact</span>
                <span className="mx-2 text-[#c0c7d8]">/</span>
                <span>plan != fact</span>
              </div>
              <div className="rounded-[20px] border border-dashed border-[#dfe5f1] bg-white p-4 text-xs text-[#9ca3b8]">
                {charCountLabel} chars
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

