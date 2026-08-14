export type AiLabUiLocale = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

export type AiLabTraceCopy = {
  title: string;
  subtitle: string;
  processing: string;
  ready: string;
  empty: string;
  processingLine: string;
  labels: Record<"system" | "model" | "check" | "fact" | "meaning" | "unresolved" | "fallback", string>;
  confirm: string;
  reject: string;
  explain: string;
  why: string;
  saving: string;
  confirmed: string;
  rejected: string;
  commentSaved: string;
  commentPlaceholder: string;
  saveComment: string;
  cancel: string;
  feedbackError: string;
};

export type AiLabManualLinkCopy = {
  add: string;
  leafOnly: string;
  immediateSaved: string;
  deferredSaved: string;
  searchPlaceholder: string;
  minChars: string;
  searching: string;
  searchError: string;
  saveError: string;
  staged: string;
  confirm: string;
  confirming: string;
  clear: string;
  partialError: string;
};

export type AiLabUiCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  transparency: string;
  message: string;
  messagePlaceholder: string;
  messageLanguage: string;
  timeZone: string;
  analyze: string;
  analyzing: string;
  clear: string;
  afterReview: string;
  edit: string;
  editActive: string;
  editBanner: string;
  savingChanges: string;
  saveChangesError: string;
  reviewLoaded: string;
  reviewLoadError: string;
  reviewSnapshotIncomplete: string;
  reviewSavedRedirect: string;
  technicalJson: string;
  journal: string;
  sourceReadOnly: string;
  trace: AiLabTraceCopy;
  manualLink: AiLabManualLinkCopy;
};

const labels = (
  system: string,
  model: string,
  check: string,
  fact: string,
  meaning: string,
  unresolved: string,
  fallback: string,
): AiLabTraceCopy["labels"] => ({ system, model, check, fact, meaning, unresolved, fallback });

export const AI_LAB_UI_COPY: Record<AiLabUiLocale, AiLabUiCopy> = {
  ru: {
    eyebrow: "ARCTor · реальный журнал активности",
    title: "Сообщить, что произошло",
    subtitle: "Лучше описывать один основной эпизод за сообщение. В том же сообщении можно указать параллельные действия, мысли, чувства, участников и измеренные величины.",
    transparency: "Журнал не показывает скрытые внутренние рассуждения модели. Он показывает проверяемый результат обработки: что выделила модель, какие реальные ЦО сервер дал ей на выбор, что она выбрала, какие факты извлечены и что сервер подтвердил или оставил неопределённым.",
    message: "Сообщение",
    messagePlaceholder: "Например: сходил в магазин, купил две консервы тунца и макароны, заплатил 20 злотых.",
    messageLanguage: "Язык сообщения",
    timeZone: "Часовой пояс",
    analyze: "Разобрать активность",
    analyzing: "Разбираю…",
    clear: "Очистить",
    afterReview: "После проверки",
    edit: "Сохранить изменения",
    editActive: "Изменения сохранены",
    editBanner: "Проверка открыта: подтверждай, отклоняй, комментируй и выбирай ЦО/ОН. Нажми «Сохранить изменения», чтобы завершить проверку.",
    savingChanges: "Сохраняю изменения…",
    saveChangesError: "Не удалось сохранить изменения", reviewLoaded: "Активность уже сохранена и ожидает проверки.", reviewLoadError: "Не удалось загрузить активность для проверки.", reviewSnapshotIncomplete: "Сохранённый результат проверки неполон.", reviewSavedRedirect: "Изменения сохранены. Возвращаюсь к списку активностей, требующих проверки.",
    technicalJson: "Технический JSON результата",
    journal: "Мой журнал активностей",
    sourceReadOnly: "Исходное сообщение сохранённой активности защищено от повторного запуска анализа на этом экране, чтобы не создать дубль.",
    trace: { title: "Журнал анализа", subtitle: "Показано, что предложила модель и что затем проверил сервер.", processing: "обработка", ready: "готово", empty: "Введите сообщение и нажмите «Разобрать активность».", processingLine: "Выполняется полный анализ…", labels: labels("СИСТЕМА", "МОДЕЛЬ", "ПРОВЕРКА", "ФАКТ", "СМЫСЛ", "НЕОПР.", "РЕЗЕРВ"), confirm: "Подтвердить", reject: "Отклонить", explain: "Добавить объяснение", why: "Почему?", saving: "сохраняю…", confirmed: "подтверждено", rejected: "отклонено", commentSaved: "комментарий сохранён", commentPlaceholder: "Что именно система поняла правильно или неправильно?", saveComment: "Сохранить комментарий", cancel: "Отмена", feedbackError: "Не удалось сохранить обратную связь" },
    manualLink: { add: "+ Добавить связь с ЦО/ОН", leafOnly: "только листовой объект", immediateSaved: "Подтверждённые связи сразу материализуются для этой активности как semantic_exposure.", deferredSaved: "Подтверждённые связи сохранятся в Data Capital и будут материализованы после создания активности.", searchPlaceholder: "Начни вводить название ЦО/ОН…", minChars: "Введи минимум 2 символа.", searching: "Ищу…", searchError: "Не удалось выполнить поиск ЦО/ОН", saveError: "Не удалось сохранить выбранные связи", staged: "Выбрано", confirm: "Подтвердить", confirming: "Сохраняю…", clear: "Снять выбор", partialError: "Часть связей не удалось сохранить; успешные уже записаны." },
  },
  en: {
    eyebrow: "ARCTor · real activity journal", title: "Tell what happened", subtitle: "It is best to describe one main episode per message. The same message may also include parallel actions, thoughts, feelings, participants and measured values.", transparency: "The journal does not expose hidden model reasoning. It shows the verifiable processing result: what the model extracted, which real Value/Observation Objects the server offered, what was selected, which facts were extracted and what the server confirmed or left unresolved.", message: "Message", messagePlaceholder: "For example: went to a shop, bought two cans of tuna and pasta, paid 20 PLN.", messageLanguage: "Message language", timeZone: "Time zone", analyze: "Analyze activity", analyzing: "Analyzing…", clear: "Clear", afterReview: "After review", edit: "Save changes", editActive: "Changes saved", editBanner: "The review is open. Confirm, reject, comment and select Value/Observation Objects, then save changes to finish the review.", savingChanges: "Saving changes…", saveChangesError: "Could not save changes", reviewLoaded: "The activity is already saved and is waiting for review.", reviewLoadError: "Could not load the activity for review.", reviewSnapshotIncomplete: "The stored review result is incomplete.", reviewSavedRedirect: "Changes saved. Returning to the list of activities requiring review.", technicalJson: "Technical result JSON", journal: "My activity journal", sourceReadOnly: "The source message of a saved activity is protected from re-analysis on this screen to prevent duplicate activities.",
    trace: { title: "Analysis log", subtitle: "Shows what the model proposed and what the server checked afterwards.", processing: "processing", ready: "ready", empty: "Enter a message and click “Analyze activity”.", processingLine: "Full analysis is running…", labels: labels("SYSTEM", "MODEL", "CHECK", "FACT", "MEANING", "UNRES.", "FALLBACK"), confirm: "Confirm", reject: "Reject", explain: "Add explanation", why: "Why?", saving: "saving…", confirmed: "confirmed", rejected: "rejected", commentSaved: "comment saved", commentPlaceholder: "What exactly did the system understand correctly or incorrectly?", saveComment: "Save comment", cancel: "Cancel", feedbackError: "Could not save feedback" },
    manualLink: { add: "+ Add Value/Observation Object link", leafOnly: "leaf object only", immediateSaved: "Confirmed links are immediately materialized for this activity as semantic_exposure.", deferredSaved: "Confirmed links are stored in Data Capital and will be materialized after the activity is created.", searchPlaceholder: "Start typing a Value/Observation Object name…", minChars: "Enter at least 2 characters.", searching: "Searching…", searchError: "Could not search Value/Observation Objects", saveError: "Could not save selected links", staged: "Selected", confirm: "Confirm", confirming: "Saving…", clear: "Clear selection", partialError: "Some links could not be saved; successful ones are already recorded." },
  },
  pl: {
    eyebrow: "ARCTor · rzeczywisty dziennik aktywności", title: "Powiedz, co się wydarzyło", subtitle: "Najlepiej opisać jeden główny epizod w wiadomości. W tej samej wiadomości można podać działania równoległe, myśli, uczucia, uczestników i zmierzone wartości.", transparency: "Dziennik nie pokazuje ukrytego rozumowania modelu. Pokazuje sprawdzalny wynik przetwarzania: co model wyodrębnił, jakie rzeczywiste obiekty wartości/obserwacji podał serwer, co wybrano i co serwer potwierdził lub pozostawił nierozstrzygnięte.", message: "Wiadomość", messagePlaceholder: "Na przykład: poszedłem do sklepu, kupiłem dwie puszki tuńczyka i makaron, zapłaciłem 20 zł.", messageLanguage: "Język wiadomości", timeZone: "Strefa czasowa", analyze: "Przeanalizuj aktywność", analyzing: "Analizuję…", clear: "Wyczyść", afterReview: "Po sprawdzeniu", edit: "Zapisz zmiany", editActive: "Zmiany zapisane", editBanner: "Weryfikacja jest otwarta. Potwierdź, odrzuć, skomentuj i wybierz obiekty wartości/obserwacji, a następnie zapisz zmiany, aby zakończyć weryfikację.", savingChanges: "Zapisuję zmiany…", saveChangesError: "Nie udało się zapisać zmian", reviewLoaded: "Aktywność jest już zapisana i oczekuje na sprawdzenie.", reviewLoadError: "Nie udało się wczytać aktywności do sprawdzenia.", reviewSnapshotIncomplete: "Zapisany wynik sprawdzenia jest niekompletny.", reviewSavedRedirect: "Zmiany zapisano. Wracam do listy aktywności wymagających sprawdzenia.", technicalJson: "Techniczny JSON wyniku", journal: "Mój dziennik aktywności", sourceReadOnly: "Wiadomość źródłowa zapisanej aktywności jest chroniona przed ponowną analizą na tym ekranie, aby nie utworzyć duplikatu.",
    trace: { title: "Dziennik analizy", subtitle: "Pokazuje propozycję modelu i późniejszą kontrolę serwera.", processing: "przetwarzanie", ready: "gotowe", empty: "Wpisz wiadomość i kliknij „Przeanalizuj aktywność”.", processingLine: "Trwa pełna analiza…", labels: labels("SYSTEM", "MODEL", "KONTROLA", "FAKT", "SENS", "NIEOKR.", "REZERWA"), confirm: "Potwierdź", reject: "Odrzuć", explain: "Dodaj wyjaśnienie", why: "Dlaczego?", saving: "zapisuję…", confirmed: "potwierdzono", rejected: "odrzucono", commentSaved: "komentarz zapisany", commentPlaceholder: "Co dokładnie system zrozumiał poprawnie lub błędnie?", saveComment: "Zapisz komentarz", cancel: "Anuluj", feedbackError: "Nie udało się zapisać informacji zwrotnej" },
    manualLink: { add: "+ Dodaj powiązanie z obiektem wartości/obserwacji", leafOnly: "tylko obiekt liściowy", immediateSaved: "Potwierdzone powiązania są od razu materializowane dla tej aktywności jako semantic_exposure.", deferredSaved: "Potwierdzone powiązania są zapisywane w Data Capital i zostaną zmaterializowane po utworzeniu aktywności.", searchPlaceholder: "Zacznij wpisywać nazwę obiektu…", minChars: "Wpisz co najmniej 2 znaki.", searching: "Szukam…", searchError: "Nie udało się wyszukać obiektów", saveError: "Nie udało się zapisać wybranych powiązań", staged: "Wybrano", confirm: "Potwierdź", confirming: "Zapisuję…", clear: "Wyczyść wybór", partialError: "Części powiązań nie udało się zapisać; poprawne są już zapisane." },
  },
  uk: {
    eyebrow: "ARCTor · реальний журнал активності", title: "Повідомити, що сталося", subtitle: "Найкраще описувати один основний епізод у повідомленні. У тому ж повідомленні можна вказати паралельні дії, думки, почуття, учасників і виміряні величини.", transparency: "Журнал не показує приховані міркування моделі. Він показує перевірюваний результат обробки: що виділила модель, які реальні цінні об’єкти/об’єкти спостереження запропонував сервер, що було вибрано і що сервер підтвердив або залишив невизначеним.", message: "Повідомлення", messagePlaceholder: "Наприклад: сходив у магазин, купив дві консерви тунця й макарони, заплатив 20 злотих.", messageLanguage: "Мова повідомлення", timeZone: "Часовий пояс", analyze: "Розібрати активність", analyzing: "Розбираю…", clear: "Очистити", afterReview: "Після перевірки", edit: "Зберегти зміни", editActive: "Зміни збережено", editBanner: "Перевірка відкрита. Підтверджуйте, відхиляйте, коментуйте та обирайте цінні об’єкти/об’єкти спостереження, а потім збережіть зміни, щоб завершити перевірку.", savingChanges: "Зберігаю зміни…", saveChangesError: "Не вдалося зберегти зміни", reviewLoaded: "Активність уже збережена й очікує на перевірку.", reviewLoadError: "Не вдалося завантажити активність для перевірки.", reviewSnapshotIncomplete: "Збережений результат перевірки неповний.", reviewSavedRedirect: "Зміни збережено. Повертаюся до списку активностей, що потребують перевірки.", technicalJson: "Технічний JSON результату", journal: "Мій журнал активностей", sourceReadOnly: "Вихідне повідомлення збереженої активності захищено від повторного аналізу на цьому екрані, щоб не створити дубль.",
    trace: { title: "Журнал аналізу", subtitle: "Показано, що запропонувала модель і що потім перевірив сервер.", processing: "обробка", ready: "готово", empty: "Введіть повідомлення і натисніть «Розібрати активність».", processingLine: "Виконується повний аналіз…", labels: labels("СИСТЕМА", "МОДЕЛЬ", "ПЕРЕВІРКА", "ФАКТ", "СЕНС", "НЕВИЗН.", "РЕЗЕРВ"), confirm: "Підтвердити", reject: "Відхилити", explain: "Додати пояснення", why: "Чому?", saving: "зберігаю…", confirmed: "підтверджено", rejected: "відхилено", commentSaved: "коментар збережено", commentPlaceholder: "Що саме система зрозуміла правильно або неправильно?", saveComment: "Зберегти коментар", cancel: "Скасувати", feedbackError: "Не вдалося зберегти зворотний зв’язок" },
    manualLink: { add: "+ Додати зв’язок із ЦО/ОС", leafOnly: "лише листовий об’єкт", immediateSaved: "Підтверджені зв’язки одразу матеріалізуються для цієї активності як semantic_exposure.", deferredSaved: "Підтверджені зв’язки зберігаються в Data Capital і будуть матеріалізовані після створення активності.", searchPlaceholder: "Почніть вводити назву ЦО/ОС…", minChars: "Введіть щонайменше 2 символи.", searching: "Шукаю…", searchError: "Не вдалося виконати пошук ЦО/ОС", saveError: "Не вдалося зберегти вибрані зв’язки", staged: "Вибрано", confirm: "Підтвердити", confirming: "Зберігаю…", clear: "Зняти вибір", partialError: "Частину зв’язків не вдалося зберегти; успішні вже записані." },
  },
  de: {
    eyebrow: "ARCTor · reales Aktivitätsjournal", title: "Mitteilen, was passiert ist", subtitle: "Am besten wird eine Hauptepisode pro Nachricht beschrieben. Dieselbe Nachricht kann parallele Handlungen, Gedanken, Gefühle, Beteiligte und Messwerte enthalten.", transparency: "Das Journal zeigt keine verborgenen Modellüberlegungen. Es zeigt das überprüfbare Verarbeitungsergebnis: was das Modell erkannt hat, welche realen Wert-/Beobachtungsobjekte der Server angeboten hat, was gewählt wurde und was bestätigt oder offen gelassen wurde.", message: "Nachricht", messagePlaceholder: "Zum Beispiel: zum Laden gegangen, zwei Dosen Thunfisch und Nudeln gekauft, 20 PLN bezahlt.", messageLanguage: "Sprache der Nachricht", timeZone: "Zeitzone", analyze: "Aktivität analysieren", analyzing: "Analysiere…", clear: "Leeren", afterReview: "Nach der Prüfung", edit: "Änderungen speichern", editActive: "Änderungen gespeichert", editBanner: "Die Prüfung ist geöffnet. Bestätigen, ablehnen, kommentieren und Wert-/Beobachtungsobjekte auswählen; anschließend Änderungen speichern, um die Prüfung abzuschließen.", savingChanges: "Änderungen werden gespeichert…", saveChangesError: "Änderungen konnten nicht gespeichert werden", reviewLoaded: "Die Aktivität ist bereits gespeichert und wartet auf Prüfung.", reviewLoadError: "Die Aktivität konnte nicht zur Prüfung geladen werden.", reviewSnapshotIncomplete: "Das gespeicherte Prüfergebnis ist unvollständig.", reviewSavedRedirect: "Änderungen gespeichert. Rückkehr zur Liste der zu prüfenden Aktivitäten.", technicalJson: "Technisches Ergebnis-JSON", journal: "Mein Aktivitätsjournal", sourceReadOnly: "Die Quellnachricht einer gespeicherten Aktivität ist auf diesem Bildschirm vor erneuter Analyse geschützt, damit kein Duplikat entsteht.",
    trace: { title: "Analyseprotokoll", subtitle: "Zeigt den Modellvorschlag und die anschließende Serverprüfung.", processing: "Verarbeitung", ready: "fertig", empty: "Nachricht eingeben und „Aktivität analysieren“ wählen.", processingLine: "Vollständige Analyse läuft…", labels: labels("SYSTEM", "MODELL", "PRÜFUNG", "FAKT", "BEDEUTUNG", "OFFEN", "RESERVE"), confirm: "Bestätigen", reject: "Ablehnen", explain: "Erklärung hinzufügen", why: "Warum?", saving: "speichere…", confirmed: "bestätigt", rejected: "abgelehnt", commentSaved: "Kommentar gespeichert", commentPlaceholder: "Was hat das System genau richtig oder falsch verstanden?", saveComment: "Kommentar speichern", cancel: "Abbrechen", feedbackError: "Feedback konnte nicht gespeichert werden" },
    manualLink: { add: "+ Verknüpfung mit Wert-/Beobachtungsobjekt", leafOnly: "nur Blattobjekt", immediateSaved: "Bestätigte Verknüpfungen werden sofort als semantic_exposure für diese Aktivität materialisiert.", deferredSaved: "Bestätigte Verknüpfungen werden in Data Capital gespeichert und nach Erstellung der Aktivität materialisiert.", searchPlaceholder: "Namen eines Wert-/Beobachtungsobjekts eingeben…", minChars: "Mindestens 2 Zeichen eingeben.", searching: "Suche…", searchError: "Objektsuche fehlgeschlagen", saveError: "Ausgewählte Verknüpfungen konnten nicht gespeichert werden", staged: "Ausgewählt", confirm: "Bestätigen", confirming: "Speichere…", clear: "Auswahl löschen", partialError: "Einige Verknüpfungen konnten nicht gespeichert werden; erfolgreiche sind bereits gespeichert." },
  },
  es: {
    eyebrow: "ARCTor · diario real de actividades", title: "Contar lo que ocurrió", subtitle: "Es mejor describir un episodio principal por mensaje. En el mismo mensaje se pueden indicar acciones paralelas, pensamientos, sentimientos, participantes y valores medidos.", transparency: "El diario no muestra razonamientos internos ocultos del modelo. Muestra el resultado verificable: qué detectó el modelo, qué objetos de valor/observación reales ofreció el servidor, qué se eligió y qué confirmó o dejó sin resolver el servidor.", message: "Mensaje", messagePlaceholder: "Por ejemplo: fui a una tienda, compré dos latas de atún y pasta, pagué 20 PLN.", messageLanguage: "Idioma del mensaje", timeZone: "Zona horaria", analyze: "Analizar actividad", analyzing: "Analizando…", clear: "Limpiar", afterReview: "Después de la revisión", edit: "Guardar cambios", editActive: "Cambios guardados", editBanner: "La revisión está abierta. Confirma, rechaza, comenta y selecciona objetos de valor/observación; luego guarda los cambios para terminar la revisión.", savingChanges: "Guardando cambios…", saveChangesError: "No se pudieron guardar los cambios", reviewLoaded: "La actividad ya está guardada y espera revisión.", reviewLoadError: "No se pudo cargar la actividad para revisarla.", reviewSnapshotIncomplete: "El resultado guardado de la revisión está incompleto.", reviewSavedRedirect: "Cambios guardados. Volviendo a la lista de actividades que requieren revisión.", technicalJson: "JSON técnico del resultado", journal: "Mi diario de actividades", sourceReadOnly: "El mensaje fuente de una actividad guardada está protegido contra un nuevo análisis en esta pantalla para evitar duplicados.",
    trace: { title: "Registro de análisis", subtitle: "Muestra lo propuesto por el modelo y la comprobación posterior del servidor.", processing: "procesando", ready: "listo", empty: "Escribe un mensaje y pulsa «Analizar actividad».", processingLine: "Ejecutando análisis completo…", labels: labels("SISTEMA", "MODELO", "COMPROB.", "HECHO", "SENTIDO", "NO RES.", "RESERVA"), confirm: "Confirmar", reject: "Rechazar", explain: "Añadir explicación", why: "¿Por qué?", saving: "guardando…", confirmed: "confirmado", rejected: "rechazado", commentSaved: "comentario guardado", commentPlaceholder: "¿Qué entendió el sistema correctamente o incorrectamente?", saveComment: "Guardar comentario", cancel: "Cancelar", feedbackError: "No se pudo guardar la respuesta" },
    manualLink: { add: "+ Añadir vínculo con objeto de valor/observación", leafOnly: "solo objeto hoja", immediateSaved: "Los vínculos confirmados se materializan inmediatamente para esta actividad como semantic_exposure.", deferredSaved: "Los vínculos confirmados se guardan en Data Capital y se materializarán después de crear la actividad.", searchPlaceholder: "Empieza a escribir el nombre de un objeto…", minChars: "Introduce al menos 2 caracteres.", searching: "Buscando…", searchError: "No se pudo buscar objetos", saveError: "No se pudieron guardar los vínculos seleccionados", staged: "Seleccionados", confirm: "Confirmar", confirming: "Guardando…", clear: "Borrar selección", partialError: "No se pudieron guardar algunos vínculos; los correctos ya están guardados." },
  },
  cs: {
    eyebrow: "ARCTor · skutečný deník aktivit", title: "Sdělte, co se stalo", subtitle: "Nejlepší je popsat jednu hlavní epizodu v jedné zprávě. Ve stejné zprávě lze uvést souběžné činnosti, myšlenky, pocity, účastníky a naměřené hodnoty.", transparency: "Deník nezobrazuje skryté vnitřní uvažování modelu. Zobrazuje ověřitelný výsledek zpracování: co model rozpoznal, jaké skutečné hodnotové/pozorovací objekty server nabídl, co bylo vybráno a co server potvrdil nebo ponechal neurčené.", message: "Zpráva", messagePlaceholder: "Například: šel jsem do obchodu, koupil dvě konzervy tuňáka a těstoviny, zaplatil 20 PLN.", messageLanguage: "Jazyk zprávy", timeZone: "Časové pásmo", analyze: "Analyzovat aktivitu", analyzing: "Analyzuji…", clear: "Vymazat", afterReview: "Po kontrole", edit: "Uložit změny", editActive: "Změny uloženy", editBanner: "Kontrola je otevřená. Potvrďte, odmítněte, komentujte a vyberte hodnotové/pozorovací objekty; poté uložte změny a kontrolu dokončete.", savingChanges: "Ukládám změny…", saveChangesError: "Změny se nepodařilo uložit", reviewLoaded: "Aktivita je již uložena a čeká na kontrolu.", reviewLoadError: "Aktivitu se nepodařilo načíst ke kontrole.", reviewSnapshotIncomplete: "Uložený výsledek kontroly je neúplný.", reviewSavedRedirect: "Změny uloženy. Vracím se na seznam aktivit vyžadujících kontrolu.", technicalJson: "Technický JSON výsledku", journal: "Můj deník aktivit", sourceReadOnly: "Zdrojová zpráva uložené aktivity je na této obrazovce chráněna před opětovnou analýzou, aby nevznikl duplikát.",
    trace: { title: "Záznam analýzy", subtitle: "Zobrazuje návrh modelu a následnou kontrolu serveru.", processing: "zpracování", ready: "hotovo", empty: "Zadejte zprávu a klikněte na „Analyzovat aktivitu“.", processingLine: "Probíhá úplná analýza…", labels: labels("SYSTÉM", "MODEL", "KONTROLA", "FAKT", "VÝZNAM", "NEURČ.", "REZERVA"), confirm: "Potvrdit", reject: "Odmítnout", explain: "Přidat vysvětlení", why: "Proč?", saving: "ukládám…", confirmed: "potvrzeno", rejected: "odmítnuto", commentSaved: "komentář uložen", commentPlaceholder: "Co přesně systém pochopil správně nebo špatně?", saveComment: "Uložit komentář", cancel: "Zrušit", feedbackError: "Zpětnou vazbu se nepodařilo uložit" },
    manualLink: { add: "+ Přidat vazbu na hodnotový/pozorovací objekt", leafOnly: "pouze listový objekt", immediateSaved: "Potvrzené vazby se pro tuto aktivitu ihned materializují jako semantic_exposure.", deferredSaved: "Potvrzené vazby se uloží do Data Capital a materializují se po vytvoření aktivity.", searchPlaceholder: "Začněte psát název objektu…", minChars: "Zadejte alespoň 2 znaky.", searching: "Hledám…", searchError: "Vyhledávání objektů selhalo", saveError: "Vybrané vazby se nepodařilo uložit", staged: "Vybráno", confirm: "Potvrdit", confirming: "Ukládám…", clear: "Zrušit výběr", partialError: "Některé vazby se nepodařilo uložit; úspěšné jsou již zapsány." },
  },
};

export function normalizeAiLabUiLocale(value: string | null | undefined): AiLabUiLocale {
  return value === "ru" || value === "pl" || value === "en" || value === "uk" ||
    value === "de" || value === "es" || value === "cs"
    ? value
    : "en";
}
