import { LOCALE_META, normalizeLocale, type LocaleCode } from "../locales";

export type AiProcessingInstructionUiCode =
  | "navigator_chat"
  | "activity_semantic_preview"
  | "activity_decomposition"
  | "fact_extraction"
  | "number_source_selection"
  | "reference_identification"
  | "value_object_matching"
  | "uncertainty_disclosure";

type ModuleCopy = { title: string; purpose: string };

type Copy = {
  admin: {
    eyebrow: string; title: string; intro: string; instructionLanguage: string;
    languageHelp: string; loading: string; immutableGuard: string;
    immutableGuardHelp: string; editableInstruction: string; saveRevision: string;
    saving: string; restoreFallback: string; reload: string; saved: string;
    restored: string; loadError: string; saveError: string; restoreError: string;
    revisionHistory: string; noHistory: string; revision: string;
    sourceLocale: string; sourceGlobal: string; sourceCode: string;
    codeDefault: string; restoreConfirm: string;
  };
  settings: {
    eyebrow: string; title: string; intro: string; generalTitle: string;
    examples: string; ruleLanguage: string; languageHelp: string;
    effectiveSource: string; effectiveRevision: string; updated: string;
    noPersonalRule: string; personalExact: string; personalGlobal: string;
    rulesLabel: string; rulesPlaceholder: string; save: string; saving: string;
    remove: string; saved: string; removed: string; enterBeforeSave: string;
    loadError: string; saveError: string; restoreError: string; removeConfirm: string;
    interpretationPriority: string; priority: readonly string[];
    revisionHistory: string; noHistory: string; revision: string;
    restoreDefaultAction: string; saveCustomAction: string; systemFallback: string;
    calendarTitle: string; calendarIntro: string; profilePersonal: string;
    profileAvatar: string;
  };
  globalLanguage: string;
  modules: Record<AiProcessingInstructionUiCode, ModuleCopy>;
};

const modules = (titles: string[], purposes: string[]): Record<AiProcessingInstructionUiCode, ModuleCopy> => ({
  navigator_chat: { title: titles[0], purpose: purposes[0] },
  activity_semantic_preview: { title: titles[1], purpose: purposes[1] },
  activity_decomposition: { title: titles[2], purpose: purposes[2] },
  fact_extraction: { title: titles[3], purpose: purposes[3] },
  number_source_selection: { title: titles[4], purpose: purposes[4] },
  reference_identification: { title: titles[5], purpose: purposes[5] },
  value_object_matching: { title: titles[6], purpose: purposes[6] },
  uncertainty_disclosure: { title: titles[7], purpose: purposes[7] },
});

const EN: Copy = {
  admin: {
    eyebrow: "ARCTor Admin", title: "AI processing instructions",
    intro: "Versioned operational instructions used by ARCTor AI processing. Immutable runtime guards remain in code and cannot be removed from this page.",
    instructionLanguage: "Instruction language",
    languageHelp: "Use global for rules that should work in every language. Create a language-specific version only when grammar, idioms, dates, units or wording change the interpretation. Priority: selected language → global → source-code default.",
    loading: "Loading instructions…", immutableGuard: "Immutable runtime guard",
    immutableGuardHelp: "This guard is always applied before editable instructions and cannot be changed from this page.",
    editableInstruction: "Editable operational instruction", saveRevision: "Save new revision",
    saving: "Saving…", restoreFallback: "Restore fallback", reload: "Reload",
    saved: "Saved. A new immutable revision was recorded.",
    restored: "Selected override disabled; effective fallback restored.",
    loadError: "Could not load AI instructions.", saveError: "Could not save the instruction.",
    restoreError: "Could not restore the fallback.", revisionHistory: "Revision history",
    noHistory: "No database revision yet. The source-code default is active.",
    revision: "Revision", sourceLocale: "Saved override for this language",
    sourceGlobal: "Global saved override", sourceCode: "Source-code default",
    codeDefault: "code default", restoreConfirm: "Restore {title} for {language} to the ARCTor fallback?",
  },
  settings: {
    eyebrow: "Settings", title: "Personal AI processing",
    intro: "Add personal defaults that help ARCTor interpret your messages. Explicit information in the current message always wins over a personal default.",
    generalTitle: "General personal defaults",
    examples: "Examples: “coffee normally means double espresso without sugar”, “my usual portion is 250 g”, or “when I say I practised German with my daughter, consider both language practice and family interaction as candidate directions”.",
    ruleLanguage: "Rule language",
    languageHelp: "Use global for personal defaults that should work in every language. Use a specific language only for wording or habits that are language-dependent. Priority: exact language → global → no personal rule.",
    effectiveSource: "Effective source", effectiveRevision: "Effective revision", updated: "updated",
    noPersonalRule: "No personal processing rule", personalExact: "Personal rule for this language",
    personalGlobal: "Global personal rule", rulesLabel: "Your personal processing rules",
    rulesPlaceholder: "Write defaults and personal interpretation rules in normal language.",
    save: "Save personal rules", saving: "Saving…", remove: "Remove personal override",
    saved: "Personal processing rules saved.", removed: "Personal override removed.",
    enterBeforeSave: "Enter a personal rule before saving.",
    loadError: "Could not load personal processing rules.", saveError: "Could not save personal processing rules.",
    restoreError: "Could not remove the personal override.",
    removeConfirm: "Remove the personal override for {language} and use fallback rules?",
    interpretationPriority: "Interpretation priority",
    priority: ["Database and security invariants cannot be overridden.", "Explicit facts and numbers in the current message are authoritative.", "Active ARCTor system instructions guide processing.", "Personal defaults fill missing context; they do not replace explicit current-message data.", "ARCTor may ask for clarification when uncertainty matters."],
    revisionHistory: "Revision history", noHistory: "No personal revision has been saved for this language yet.",
    revision: "Revision", restoreDefaultAction: "restore default", saveCustomAction: "save custom",
    systemFallback: "(system fallback)", calendarTitle: "Calendar-specific rules",
    calendarIntro: "Existing calendar rules remain a separate specialised layer. They are applied only to calendar timing and target interpretation.",
    profilePersonal: "personal", profileAvatar: "avatar",
  },
  globalLanguage: "global — all languages",
  modules: modules(
    ["AI Navigator — general assistant", "Activity semantic preview", "Activity decomposition", "Fact extraction", "Number source selection", "Product and reference identification", "Observation-object matching", "Uncertainty disclosure"],
    ["Operational guidance for the right-column AI Navigator.", "Core guidance for AI interpretation of activity messages before any write.", "How messages containing several independent actions are separated.", "How measurable and structured facts are extracted from activity text.", "How explicit numbers, measurements, calculations and estimates are distinguished.", "How exact products/references are distinguished from typical fallbacks.", "How candidate leaf observation objects are proposed for activity facts.", "How assumptions and uncertainty are made visible to the user."]
  ),
};

const RU: Copy = {
  ...EN,
  admin: { ...EN.admin,
    eyebrow: "Администрирование ARCTor", title: "Инструкции обработки ИИ",
    intro: "Версионируемые рабочие инструкции, которые получает ИИ ARCTor. Неизменяемые защитные правила остаются в коде и не могут быть удалены с этой страницы.",
    instructionLanguage: "Язык инструкции",
    languageHelp: "Используйте global для правил, которые должны работать на любом языке. Отдельную языковую версию создавайте только когда грамматика, устойчивые выражения, даты, единицы или формулировки меняют смысл. Приоритет: выбранный язык → global → встроенная инструкция.",
    loading: "Загрузка инструкций…", immutableGuard: "Неизменяемая защитная инструкция",
    immutableGuardHelp: "Эта защита всегда применяется перед редактируемыми инструкциями и не может быть изменена на этой странице.",
    editableInstruction: "Редактируемая рабочая инструкция", saveRevision: "Сохранить новую версию", saving: "Сохраняю…",
    restoreFallback: "Вернуть резервную версию", reload: "Обновить",
    saved: "Сохранено. Создана новая неизменяемая версия.", restored: "Переопределение отключено; восстановлена резервная версия.",
    loadError: "Не удалось загрузить инструкции ИИ.", saveError: "Не удалось сохранить инструкцию.", restoreError: "Не удалось восстановить резервную версию.",
    revisionHistory: "История версий", noHistory: "Версий в базе пока нет. Используется встроенная инструкция.", revision: "Версия",
    sourceLocale: "Сохранённая версия для этого языка", sourceGlobal: "Сохранённая общая версия", sourceCode: "Встроенная версия программы", codeDefault: "встроенная",
    restoreConfirm: "Вернуть {title} для {language} к резервной версии ARCTor?",
  },
  settings: { ...EN.settings,
    eyebrow: "Настройки", title: "Персональная обработка ИИ",
    intro: "Добавьте личные правила, которые помогают ARCTor понимать ваши сообщения. Явно указанная в текущем сообщении информация всегда важнее персонального правила.",
    generalTitle: "Общие персональные правила",
    examples: "Примеры: «кофе обычно означает двойной эспрессо без сахара», «моя обычная порция — 250 г» или «если я пишу, что занимался немецким с дочерью, рассматривай и практику языка, и общение с семьёй как возможные направления».",
    ruleLanguage: "Язык правила", languageHelp: "Используйте global для личных правил, действующих на любом языке. Отдельный язык нужен только для выражений и привычек, зависящих от языка. Приоритет: точный язык → global → без персонального правила.",
    effectiveSource: "Используемый источник", effectiveRevision: "Используемая версия", updated: "обновлено",
    noPersonalRule: "Персонального правила нет", personalExact: "Персональное правило для этого языка", personalGlobal: "Общее персональное правило",
    rulesLabel: "Ваши персональные правила обработки", rulesPlaceholder: "Опишите обычным языком личные значения по умолчанию и правила интерпретации.",
    save: "Сохранить персональные правила", saving: "Сохраняю…", remove: "Удалить персональное переопределение",
    saved: "Персональные правила сохранены.", removed: "Персональное переопределение удалено.", enterBeforeSave: "Сначала введите персональное правило.",
    loadError: "Не удалось загрузить персональные правила.", saveError: "Не удалось сохранить персональные правила.", restoreError: "Не удалось удалить персональное переопределение.",
    removeConfirm: "Удалить персональное переопределение для {language} и использовать резервные правила?",
    interpretationPriority: "Приоритет интерпретации", priority: ["Правила базы данных и безопасности нельзя переопределить.", "Явные факты и числа текущего сообщения имеют приоритет.", "Действующие системные инструкции ARCTor направляют обработку.", "Персональные правила заполняют недостающий контекст, но не заменяют явные данные сообщения.", "Если неопределённость важна, ARCTor может попросить уточнение."],
    revisionHistory: "История версий", noHistory: "Для этого языка ещё нет сохранённых персональных версий.", revision: "Версия",
    restoreDefaultAction: "возврат к умолчанию", saveCustomAction: "персональная версия", systemFallback: "(системная версия)",
    calendarTitle: "Специальные правила календаря", calendarIntro: "Календарные правила остаются отдельным специализированным слоем и применяются только к времени, датам и календарным целям.",
    profilePersonal: "личный профиль", profileAvatar: "аватар",
  },
  globalLanguage: "global — все языки",
  modules: modules(["AI-Навигатор — общий помощник", "Предварительный разбор активности", "Разделение активностей", "Извлечение фактов", "Выбор источника чисел", "Определение товара и источника", "Подбор объектов наблюдения", "Отображение неопределённости"], ["Рабочие правила правой панели AI-Навигатора.", "Основные правила AI-разбора сообщения об активности до записи.", "Как разделять сообщение с несколькими независимыми действиями.", "Как извлекать измеримые и структурированные факты.", "Как отличать явные числа, измерения, вычисления и оценки.", "Как отличать точно определённый товар от типового аналога.", "Как предлагать листовые объекты наблюдения для фактов.", "Как показывать пользователю предположения и неопределённость."]),
};

const PL: Copy = {
  ...EN,
  admin: { ...EN.admin, eyebrow: "Administracja ARCTor", title: "Instrukcje przetwarzania AI", intro: "Wersjonowane instrukcje operacyjne używane przez AI w ARCTor. Niezmienne zabezpieczenia pozostają w kodzie i nie można ich usunąć z tej strony.", instructionLanguage: "Język instrukcji", languageHelp: "Użyj global dla reguł obowiązujących we wszystkich językach. Osobną wersję językową twórz tylko wtedy, gdy gramatyka, idiomy, daty, jednostki lub sformułowania zmieniają interpretację. Priorytet: wybrany język → global → wersja w kodzie.", loading: "Ładowanie instrukcji…", immutableGuard: "Niezmienne zabezpieczenie wykonawcze", immutableGuardHelp: "To zabezpieczenie jest zawsze stosowane przed instrukcjami edytowalnymi i nie można go zmienić na tej stronie.", editableInstruction: "Edytowalna instrukcja operacyjna", saveRevision: "Zapisz nową wersję", saving: "Zapisywanie…", restoreFallback: "Przywróć wersję zapasową", reload: "Odśwież", saved: "Zapisano. Utworzono nową niezmienną wersję.", restored: "Wyłączono nadpisanie; przywrócono wersję zapasową.", loadError: "Nie udało się załadować instrukcji AI.", saveError: "Nie udało się zapisać instrukcji.", restoreError: "Nie udało się przywrócić wersji zapasowej.", revisionHistory: "Historia wersji", noHistory: "Brak wersji w bazie. Aktywna jest wersja z kodu.", revision: "Wersja", sourceLocale: "Zapisane nadpisanie dla tego języka", sourceGlobal: "Zapisane nadpisanie globalne", sourceCode: "Domyślna wersja z kodu", codeDefault: "wersja z kodu", restoreConfirm: "Przywrócić {title} dla {language} do wersji zapasowej ARCTor?" },
  settings: { ...EN.settings, eyebrow: "Ustawienia", title: "Osobiste przetwarzanie AI", intro: "Dodaj osobiste ustawienia pomagające ARCTor interpretować Twoje wiadomości. Jawna informacja w bieżącej wiadomości zawsze ma pierwszeństwo.", generalTitle: "Ogólne ustawienia osobiste", examples: "Przykłady: „kawa zwykle oznacza podwójne espresso bez cukru”, „moja zwykła porcja to 250 g” albo „gdy piszę, że ćwiczyłem niemiecki z córką, uwzględnij naukę języka i relację rodzinną jako możliwe kierunki”.", ruleLanguage: "Język reguły", languageHelp: "Użyj global dla osobistych ustawień działających we wszystkich językach. Wybierz konkretny język tylko dla sformułowań lub nawyków zależnych od języka. Priorytet: dokładny język → global → brak reguły osobistej.", effectiveSource: "Skuteczne źródło", effectiveRevision: "Skuteczna wersja", updated: "zaktualizowano", noPersonalRule: "Brak osobistej reguły przetwarzania", personalExact: "Osobista reguła dla tego języka", personalGlobal: "Globalna reguła osobista", rulesLabel: "Twoje osobiste reguły przetwarzania", rulesPlaceholder: "Opisz zwykłym językiem swoje domyślne założenia i zasady interpretacji.", save: "Zapisz reguły osobiste", saving: "Zapisywanie…", remove: "Usuń osobiste nadpisanie", saved: "Osobiste reguły zapisano.", removed: "Osobiste nadpisanie usunięto.", enterBeforeSave: "Najpierw wpisz osobistą regułę.", loadError: "Nie udało się załadować osobistych reguł.", saveError: "Nie udało się zapisać osobistych reguł.", restoreError: "Nie udało się usunąć osobistego nadpisania.", removeConfirm: "Usunąć osobiste nadpisanie dla {language} i użyć reguł zapasowych?", interpretationPriority: "Priorytet interpretacji", priority: ["Nie można nadpisać reguł bazy danych ani bezpieczeństwa.", "Jawne fakty i liczby w bieżącej wiadomości są nadrzędne.", "Aktywne instrukcje systemowe ARCTor kierują przetwarzaniem.", "Reguły osobiste uzupełniają brakujący kontekst, lecz nie zastępują jawnych danych.", "ARCTor może poprosić o doprecyzowanie, gdy niepewność ma znaczenie."], revisionHistory: "Historia wersji", noHistory: "Dla tego języka nie zapisano jeszcze osobistej wersji.", revision: "Wersja", restoreDefaultAction: "przywrócenie domyślnej", saveCustomAction: "wersja osobista", systemFallback: "(wersja systemowa)", calendarTitle: "Specjalne reguły kalendarza", calendarIntro: "Reguły kalendarza pozostają oddzielną warstwą specjalistyczną i dotyczą tylko czasu, dat oraz celów kalendarza.", profilePersonal: "profil osobisty", profileAvatar: "awatar" },
  globalLanguage: "global — wszystkie języki",
  modules: modules(["AI Navigator — asystent ogólny", "Wstępna analiza aktywności", "Rozdzielanie aktywności", "Wydobywanie faktów", "Wybór źródła liczb", "Identyfikacja produktu i źródła", "Dobór obiektów obserwacji", "Pokazywanie niepewności"], ["Reguły operacyjne prawego panelu AI Navigator.", "Główne reguły interpretacji wiadomości o aktywności przed zapisem.", "Jak rozdzielać kilka niezależnych działań.", "Jak wydobywać mierzalne i ustrukturyzowane fakty.", "Jak rozróżniać liczby, pomiary, obliczenia i oszacowania.", "Jak odróżniać dokładnie rozpoznany produkt od typowego odpowiednika.", "Jak proponować liściowe obiekty obserwacji.", "Jak pokazywać użytkownikowi założenia i niepewność."]),
};

const UK: Copy = {
  ...EN,
  admin: { ...EN.admin, eyebrow: "Адміністрування ARCTor", title: "Інструкції обробки ШІ", intro: "Версійовані робочі інструкції, які використовує ШІ ARCTor. Незмінні захисні правила залишаються в коді й не можуть бути видалені з цієї сторінки.", instructionLanguage: "Мова інструкції", languageHelp: "Використовуйте global для правил, що мають працювати всіма мовами. Окрему мовну версію створюйте лише тоді, коли граматика, сталі вирази, дати, одиниці або формулювання змінюють інтерпретацію. Пріоритет: вибрана мова → global → вбудована інструкція.", loading: "Завантаження інструкцій…", immutableGuard: "Незмінна захисна інструкція", immutableGuardHelp: "Цей захист завжди застосовується перед редагованими інструкціями й не може бути змінений на цій сторінці.", editableInstruction: "Редагована робоча інструкція", saveRevision: "Зберегти нову версію", saving: "Збереження…", restoreFallback: "Повернути резервну версію", reload: "Оновити", saved: "Збережено. Створено нову незмінну версію.", restored: "Перевизначення вимкнено; відновлено резервну версію.", loadError: "Не вдалося завантажити інструкції ШІ.", saveError: "Не вдалося зберегти інструкцію.", restoreError: "Не вдалося відновити резервну версію.", revisionHistory: "Історія версій", noHistory: "Версій у базі ще немає. Використовується вбудована інструкція.", revision: "Версія", sourceLocale: "Збережена версія для цієї мови", sourceGlobal: "Збережена загальна версія", sourceCode: "Вбудована версія програми", codeDefault: "вбудована", restoreConfirm: "Повернути {title} для {language} до резервної версії ARCTor?" },
  settings: { ...EN.settings, eyebrow: "Налаштування", title: "Персональна обробка ШІ", intro: "Додайте особисті правила, які допомагають ARCTor розуміти ваші повідомлення. Явно вказана в поточному повідомленні інформація завжди важливіша за персональне правило.", generalTitle: "Загальні персональні правила", examples: "Приклади: «кава зазвичай означає подвійне еспресо без цукру», «моя звична порція — 250 г» або «якщо я пишу, що займався німецькою з донькою, розглядай і мовну практику, і сімейне спілкування як можливі напрями».", ruleLanguage: "Мова правила", languageHelp: "Використовуйте global для особистих правил, що працюють усіма мовами. Окрема мова потрібна лише для висловів або звичок, залежних від мови. Пріоритет: точна мова → global → без персонального правила.", effectiveSource: "Чинне джерело", effectiveRevision: "Чинна версія", updated: "оновлено", noPersonalRule: "Персонального правила немає", personalExact: "Персональне правило для цієї мови", personalGlobal: "Загальне персональне правило", rulesLabel: "Ваші персональні правила обробки", rulesPlaceholder: "Опишіть звичайною мовою особисті значення за замовчуванням і правила інтерпретації.", save: "Зберегти персональні правила", saving: "Збереження…", remove: "Видалити персональне перевизначення", saved: "Персональні правила збережено.", removed: "Персональне перевизначення видалено.", enterBeforeSave: "Спочатку введіть персональне правило.", loadError: "Не вдалося завантажити персональні правила.", saveError: "Не вдалося зберегти персональні правила.", restoreError: "Не вдалося видалити персональне перевизначення.", removeConfirm: "Видалити персональне перевизначення для {language} і використати резервні правила?", interpretationPriority: "Пріоритет інтерпретації", priority: ["Правила бази даних і безпеки не можна перевизначити.", "Явні факти й числа поточного повідомлення мають пріоритет.", "Чинні системні інструкції ARCTor спрямовують обробку.", "Персональні правила заповнюють відсутній контекст, але не замінюють явні дані.", "Якщо невизначеність важлива, ARCTor може попросити уточнення."], revisionHistory: "Історія версій", noHistory: "Для цієї мови ще немає збережених персональних версій.", revision: "Версія", restoreDefaultAction: "повернення до стандарту", saveCustomAction: "персональна версія", systemFallback: "(системна версія)", calendarTitle: "Спеціальні правила календаря", calendarIntro: "Календарні правила залишаються окремим спеціалізованим шаром і застосовуються лише до часу, дат і календарних цілей.", profilePersonal: "особистий профіль", profileAvatar: "аватар" },
  globalLanguage: "global — усі мови",
  modules: modules(["AI-Навігатор — загальний помічник", "Попередній розбір активності", "Розділення активностей", "Вилучення фактів", "Вибір джерела чисел", "Визначення товару та джерела", "Добір об’єктів спостереження", "Відображення невизначеності"], ["Робочі правила правої панелі AI-Навігатора.", "Основні правила ШІ-інтерпретації повідомлення про активність до запису.", "Як розділяти кілька незалежних дій.", "Як вилучати вимірювані та структуровані факти.", "Як відрізняти явні числа, вимірювання, обчислення та оцінки.", "Як відрізняти точно визначений товар від типового аналога.", "Як пропонувати листові об’єкти спостереження.", "Як показувати користувачеві припущення та невизначеність."]),
};

const DE: Copy = {
  ...EN,
  admin: { ...EN.admin,
    eyebrow: "ARCTor-Administration", title: "KI-Verarbeitungsanweisungen",
    intro: "Versionierte Arbeitsanweisungen für die KI-Verarbeitung in ARCTor. Unveränderliche Schutzregeln bleiben im Code und können auf dieser Seite nicht entfernt werden.",
    instructionLanguage: "Sprache der Anweisung",
    languageHelp: "Verwende global für Regeln, die in allen Sprachen gelten. Eine sprachspezifische Version ist nur nötig, wenn Grammatik, Redewendungen, Datumsangaben, Einheiten oder Formulierungen die Interpretation ändern. Priorität: gewählte Sprache → global → Code-Standard.",
    loading: "Anweisungen werden geladen…", immutableGuard: "Unveränderliche Laufzeitschutzregel",
    immutableGuardHelp: "Diese Schutzregel wird immer vor editierbaren Anweisungen angewendet und kann hier nicht geändert werden.",
    editableInstruction: "Editierbare Arbeitsanweisung", saveRevision: "Neue Version speichern", saving: "Speichern…",
    restoreFallback: "Fallback wiederherstellen", reload: "Neu laden",
    saved: "Gespeichert. Eine neue unveränderliche Version wurde angelegt.", restored: "Überschreibung deaktiviert; wirksamer Fallback wiederhergestellt.",
    loadError: "KI-Anweisungen konnten nicht geladen werden.", saveError: "Anweisung konnte nicht gespeichert werden.", restoreError: "Fallback konnte nicht wiederhergestellt werden.",
    revisionHistory: "Versionsverlauf", noHistory: "Noch keine Datenbankversion. Der Code-Standard ist aktiv.", revision: "Version",
    sourceLocale: "Gespeicherte Überschreibung für diese Sprache", sourceGlobal: "Gespeicherte globale Überschreibung", sourceCode: "Code-Standard", codeDefault: "Code-Standard",
    restoreConfirm: "{title} für {language} auf den ARCTor-Fallback zurücksetzen?",
  },
  settings: { ...EN.settings,
    eyebrow: "Einstellungen", title: "Persönliche KI-Verarbeitung",
    intro: "Füge persönliche Vorgaben hinzu, die ARCTor beim Verstehen deiner Nachrichten helfen. Explizite Angaben in der aktuellen Nachricht haben immer Vorrang.",
    generalTitle: "Allgemeine persönliche Vorgaben",
    examples: "Beispiele: „Kaffee bedeutet normalerweise doppelten Espresso ohne Zucker“, „meine übliche Portion sind 250 g“ oder „wenn ich schreibe, dass ich mit meiner Tochter Deutsch geübt habe, berücksichtige Sprachpraxis und Familienkontakt als mögliche Richtungen“.",
    ruleLanguage: "Sprache der Regel", languageHelp: "Verwende global für persönliche Vorgaben in allen Sprachen. Eine bestimmte Sprache ist nur für sprachabhängige Formulierungen oder Gewohnheiten nötig. Priorität: genaue Sprache → global → keine persönliche Regel.",
    effectiveSource: "Wirksame Quelle", effectiveRevision: "Wirksame Version", updated: "aktualisiert",
    noPersonalRule: "Keine persönliche Verarbeitungsregel", personalExact: "Persönliche Regel für diese Sprache", personalGlobal: "Globale persönliche Regel",
    rulesLabel: "Deine persönlichen Verarbeitungsregeln", rulesPlaceholder: "Beschreibe deine persönlichen Standardannahmen und Interpretationsregeln in normaler Sprache.",
    save: "Persönliche Regeln speichern", saving: "Speichern…", remove: "Persönliche Überschreibung entfernen",
    saved: "Persönliche Regeln gespeichert.", removed: "Persönliche Überschreibung entfernt.", enterBeforeSave: "Gib zuerst eine persönliche Regel ein.",
    loadError: "Persönliche Regeln konnten nicht geladen werden.", saveError: "Persönliche Regeln konnten nicht gespeichert werden.", restoreError: "Persönliche Überschreibung konnte nicht entfernt werden.",
    removeConfirm: "Persönliche Überschreibung für {language} entfernen und Fallback-Regeln verwenden?",
    interpretationPriority: "Interpretationspriorität", priority: ["Datenbank- und Sicherheitsregeln können nicht überschrieben werden.", "Explizite Fakten und Zahlen der aktuellen Nachricht haben Vorrang.", "Aktive ARCTor-Systemanweisungen steuern die Verarbeitung.", "Persönliche Vorgaben ergänzen fehlenden Kontext, ersetzen aber keine expliziten Angaben.", "Bei wichtiger Unsicherheit kann ARCTor nachfragen."],
    revisionHistory: "Versionsverlauf", noHistory: "Für diese Sprache wurde noch keine persönliche Version gespeichert.", revision: "Version",
    restoreDefaultAction: "Standard wiederherstellen", saveCustomAction: "persönliche Version", systemFallback: "(System-Fallback)",
    calendarTitle: "Spezielle Kalenderregeln", calendarIntro: "Kalenderregeln bleiben eine separate Spezialeinstellung für Zeit, Datum und Kalenderziele.",
    profilePersonal: "persönliches Profil", profileAvatar: "Avatar",
  },
  globalLanguage: "global — alle Sprachen",
  modules: modules(["AI Navigator — allgemeiner Assistent", "Aktivitätsvorschau", "Aufteilung von Aktivitäten", "Faktenextraktion", "Auswahl der Zahlenquelle", "Produkt- und Referenzidentifikation", "Zuordnung von Beobachtungsobjekten", "Offenlegung von Unsicherheit"], ["Arbeitsregeln für den AI Navigator in der rechten Spalte.", "Grundregeln für die KI-Interpretation von Aktivitätsnachrichten vor dem Speichern.", "Wie Nachrichten mit mehreren unabhängigen Handlungen getrennt werden.", "Wie messbare und strukturierte Fakten aus Aktivitätstexten gewonnen werden.", "Wie explizite Zahlen, Messungen, Berechnungen und Schätzungen unterschieden werden.", "Wie ein exakt erkanntes Produkt von einem typischen Ersatz unterschieden wird.", "Wie Blatt-Beobachtungsobjekte für Aktivitätsfakten vorgeschlagen werden.", "Wie Annahmen und Unsicherheit sichtbar gemacht werden."]),
};

const ES: Copy = {
  ...EN,
  admin: { ...EN.admin,
    eyebrow: "Administración de ARCTor", title: "Instrucciones de procesamiento de IA",
    intro: "Instrucciones operativas versionadas que usa la IA de ARCTor. Las protecciones inmutables permanecen en el código y no pueden eliminarse desde esta página.",
    instructionLanguage: "Idioma de la instrucción",
    languageHelp: "Usa global para reglas válidas en todos los idiomas. Crea una versión específica solo cuando la gramática, los modismos, las fechas, las unidades o la redacción cambien la interpretación. Prioridad: idioma seleccionado → global → valor del código.",
    loading: "Cargando instrucciones…", immutableGuard: "Protección de ejecución inmutable",
    immutableGuardHelp: "Esta protección siempre se aplica antes de las instrucciones editables y no puede modificarse aquí.",
    editableInstruction: "Instrucción operativa editable", saveRevision: "Guardar nueva versión", saving: "Guardando…",
    restoreFallback: "Restaurar alternativa", reload: "Recargar",
    saved: "Guardado. Se registró una nueva versión inmutable.", restored: "Se desactivó la sustitución; se restauró la alternativa efectiva.",
    loadError: "No se pudieron cargar las instrucciones de IA.", saveError: "No se pudo guardar la instrucción.", restoreError: "No se pudo restaurar la alternativa.",
    revisionHistory: "Historial de versiones", noHistory: "Aún no hay versión en la base. Está activo el valor del código.", revision: "Versión",
    sourceLocale: "Sustitución guardada para este idioma", sourceGlobal: "Sustitución global guardada", sourceCode: "Valor predeterminado del código", codeDefault: "valor del código",
    restoreConfirm: "¿Restaurar {title} para {language} a la alternativa de ARCTor?",
  },
  settings: { ...EN.settings,
    eyebrow: "Configuración", title: "Procesamiento personal de IA",
    intro: "Añade reglas personales que ayuden a ARCTor a interpretar tus mensajes. La información explícita del mensaje actual siempre tiene prioridad.",
    generalTitle: "Valores personales generales",
    examples: "Ejemplos: «café normalmente significa espresso doble sin azúcar», «mi porción habitual es de 250 g» o «cuando digo que practiqué alemán con mi hija, considera el idioma y la interacción familiar como posibles direcciones».",
    ruleLanguage: "Idioma de la regla", languageHelp: "Usa global para reglas personales válidas en todos los idiomas. Usa un idioma concreto solo para expresiones o hábitos dependientes del idioma. Prioridad: idioma exacto → global → sin regla personal.",
    effectiveSource: "Fuente efectiva", effectiveRevision: "Versión efectiva", updated: "actualizado",
    noPersonalRule: "No hay regla personal de procesamiento", personalExact: "Regla personal para este idioma", personalGlobal: "Regla personal global",
    rulesLabel: "Tus reglas personales de procesamiento", rulesPlaceholder: "Describe en lenguaje normal tus valores predeterminados y reglas personales de interpretación.",
    save: "Guardar reglas personales", saving: "Guardando…", remove: "Eliminar sustitución personal",
    saved: "Reglas personales guardadas.", removed: "Sustitución personal eliminada.", enterBeforeSave: "Introduce primero una regla personal.",
    loadError: "No se pudieron cargar las reglas personales.", saveError: "No se pudieron guardar las reglas personales.", restoreError: "No se pudo eliminar la sustitución personal.",
    removeConfirm: "¿Eliminar la sustitución personal para {language} y usar las reglas alternativas?",
    interpretationPriority: "Prioridad de interpretación", priority: ["Las reglas de base de datos y seguridad no se pueden sobrescribir.", "Los hechos y números explícitos del mensaje actual tienen prioridad.", "Las instrucciones activas del sistema ARCTor guían el procesamiento.", "Las reglas personales completan el contexto faltante, pero no sustituyen datos explícitos.", "ARCTor puede pedir una aclaración cuando la incertidumbre sea importante."],
    revisionHistory: "Historial de versiones", noHistory: "Todavía no hay una versión personal guardada para este idioma.", revision: "Versión",
    restoreDefaultAction: "restaurar predeterminado", saveCustomAction: "versión personal", systemFallback: "(alternativa del sistema)",
    calendarTitle: "Reglas específicas del calendario", calendarIntro: "Las reglas del calendario siguen siendo una capa separada para tiempo, fechas y objetivos.",
    profilePersonal: "perfil personal", profileAvatar: "avatar",
  },
  globalLanguage: "global — todos los idiomas",
  modules: modules(["AI Navigator — asistente general", "Vista previa semántica de actividad", "Descomposición de actividades", "Extracción de hechos", "Selección de fuente numérica", "Identificación de producto y referencia", "Asignación de objetos de observación", "Divulgación de incertidumbre"], ["Reglas operativas del AI Navigator de la columna derecha.", "Reglas principales para interpretar mensajes de actividad antes de guardar.", "Cómo separar mensajes con varias acciones independientes.", "Cómo extraer hechos medibles y estructurados del texto de actividad.", "Cómo distinguir números explícitos, mediciones, cálculos y estimaciones.", "Cómo distinguir un producto exacto de un sustituto típico.", "Cómo proponer objetos hoja de observación para hechos de actividad.", "Cómo mostrar las suposiciones y la incertidumbre."]),
};

const CS: Copy = {
  ...EN,
  admin: { ...EN.admin,
    eyebrow: "Správa ARCTor", title: "Instrukce zpracování AI",
    intro: "Verzované provozní instrukce používané AI v ARCTor. Neměnné ochranné podmínky zůstávají v kódu a z této stránky je nelze odstranit.",
    instructionLanguage: "Jazyk instrukce",
    languageHelp: "Použijte global pro pravidla platná ve všech jazycích. Jazykovou verzi vytvářejte jen tehdy, když gramatika, idiomy, data, jednotky nebo formulace mění interpretaci. Priorita: vybraný jazyk → global → výchozí verze v kódu.",
    loading: "Načítání instrukcí…", immutableGuard: "Neměnná ochrana běhu",
    immutableGuardHelp: "Tato ochrana se vždy použije před editovatelnými instrukcemi a na této stránce ji nelze změnit.",
    editableInstruction: "Editovatelná provozní instrukce", saveRevision: "Uložit novou verzi", saving: "Ukládání…",
    restoreFallback: "Obnovit náhradní verzi", reload: "Načíst znovu",
    saved: "Uloženo. Byla vytvořena nová neměnná verze.", restored: "Přepsání vypnuto; byla obnovena účinná náhradní verze.",
    loadError: "Instrukce AI se nepodařilo načíst.", saveError: "Instrukci se nepodařilo uložit.", restoreError: "Náhradní verzi se nepodařilo obnovit.",
    revisionHistory: "Historie verzí", noHistory: "V databázi zatím není verze. Aktivní je výchozí verze v kódu.", revision: "Verze",
    sourceLocale: "Uložené přepsání pro tento jazyk", sourceGlobal: "Uložené globální přepsání", sourceCode: "Výchozí verze v kódu", codeDefault: "verze v kódu",
    restoreConfirm: "Obnovit {title} pro {language} na náhradní verzi ARCTor?",
  },
  settings: { ...EN.settings,
    eyebrow: "Nastavení", title: "Osobní zpracování AI",
    intro: "Přidejte osobní pravidla, která ARCTor pomohou interpretovat vaše zprávy. Výslovná informace v aktuální zprávě má vždy přednost.",
    generalTitle: "Obecná osobní pravidla",
    examples: "Příklady: „káva obvykle znamená dvojité espresso bez cukru“, „moje běžná porce je 250 g“ nebo „když napíšu, že jsem cvičil němčinu s dcerou, ber jako možné směry jazykovou praxi i rodinnou interakci“.",
    ruleLanguage: "Jazyk pravidla", languageHelp: "Použijte global pro osobní pravidla ve všech jazycích. Konkrétní jazyk použijte jen pro formulace nebo zvyklosti závislé na jazyce. Priorita: přesný jazyk → global → žádné osobní pravidlo.",
    effectiveSource: "Účinný zdroj", effectiveRevision: "Účinná verze", updated: "aktualizováno",
    noPersonalRule: "Žádné osobní pravidlo zpracování", personalExact: "Osobní pravidlo pro tento jazyk", personalGlobal: "Globální osobní pravidlo",
    rulesLabel: "Vaše osobní pravidla zpracování", rulesPlaceholder: "Popište běžným jazykem své osobní výchozí hodnoty a pravidla interpretace.",
    save: "Uložit osobní pravidla", saving: "Ukládání…", remove: "Odstranit osobní přepsání",
    saved: "Osobní pravidla byla uložena.", removed: "Osobní přepsání bylo odstraněno.", enterBeforeSave: "Nejprve zadejte osobní pravidlo.",
    loadError: "Osobní pravidla se nepodařilo načíst.", saveError: "Osobní pravidla se nepodařilo uložit.", restoreError: "Osobní přepsání se nepodařilo odstranit.",
    removeConfirm: "Odstranit osobní přepsání pro {language} a použít náhradní pravidla?",
    interpretationPriority: "Priorita interpretace", priority: ["Pravidla databáze a bezpečnosti nelze přepsat.", "Výslovná fakta a čísla v aktuální zprávě mají přednost.", "Aktivní systémové instrukce ARCTor řídí zpracování.", "Osobní pravidla doplňují chybějící kontext, ale nenahrazují výslovná data.", "ARCTor může požádat o upřesnění, pokud je nejistota důležitá."],
    revisionHistory: "Historie verzí", noHistory: "Pro tento jazyk zatím nebyla uložena osobní verze.", revision: "Verze",
    restoreDefaultAction: "obnovit výchozí", saveCustomAction: "osobní verze", systemFallback: "(systémová náhrada)",
    calendarTitle: "Speciální pravidla kalendáře", calendarIntro: "Pravidla kalendáře zůstávají samostatnou vrstvou pro čas, data a cíle.",
    profilePersonal: "osobní profil", profileAvatar: "avatar",
  },
  globalLanguage: "global — všechny jazyky",
  modules: modules(["AI Navigator — obecný asistent", "Náhled interpretace aktivity", "Rozdělení aktivit", "Extrakce faktů", "Výběr zdroje čísel", "Identifikace produktu a zdroje", "Přiřazení objektů pozorování", "Zobrazení nejistoty"], ["Provozní pravidla pravého panelu AI Navigator.", "Hlavní pravidla AI interpretace zpráv o aktivitě před uložením.", "Jak rozdělovat zprávy obsahující několik nezávislých činností.", "Jak získávat měřitelné a strukturované fakty z textu aktivity.", "Jak rozlišovat výslovná čísla, měření, výpočty a odhady.", "Jak odlišit přesně určený produkt od typického náhradního údaje.", "Jak navrhovat listové objekty pozorování pro fakta aktivity.", "Jak uživateli zobrazovat předpoklady a nejistotu."]),
};

const COPY: Record<LocaleCode, Copy> = { en: EN, ru: RU, pl: PL, uk: UK, de: DE, es: ES, cs: CS };

export function getAiProcessingUiCopy(locale: unknown): Copy { return COPY[normalizeLocale(locale)]; }
export function getAiProcessingInstructionUiCopy(code: string, locale: unknown, fallback?: ModuleCopy): ModuleCopy { return getAiProcessingUiCopy(locale).modules[code as AiProcessingInstructionUiCode] ?? fallback ?? { title: code, purpose: "" }; }
export function getAiProcessingInstructionLanguageLabel(language: "global" | LocaleCode, interfaceLocale: unknown): string { if (language === "global") return getAiProcessingUiCopy(interfaceLocale).globalLanguage; return `${language} — ${LOCALE_META[language].nativeName}`; }
export function getAiProcessingBrowserLocale(locale: unknown): string { return ({ ru: "ru-RU", pl: "pl-PL", en: "en-GB", es: "es-ES", uk: "uk-UA", de: "de-DE", cs: "cs-CZ" } as const)[normalizeLocale(locale)]; }
export function formatAiProcessingTemplate(template: string, params: Record<string, string>): string { return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => params[key] ?? match); }
