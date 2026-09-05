"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { LocaleCode } from "@/i18n";

type ScopeCode = "private" | "system";
type NodeRoleCode = "root" | "intermediate" | "leaf";
type DecisionCode =
  | "existing_leaf_found"
  | "new_leaf_required"
  | "parameter_not_assigned"
  | "needs_clarification";

type Option = {
  id: string;
  title: string;
  canonicalKey: string | null;
  nodeRole: NodeRoleCode | null;
  scopeCode: "actor" | "global";
  status: string;
};

type CreationItem = {
  id: string;
  scope: ScopeCode | null;
  nodeRole: NodeRoleCode | null;
  valueObjectId: string | null;
  canonicalKey: string | null;
  title: string | null;
  resultSummaryRu: string | null;
  resultSummaryEn: string | null;
  completedTargetLeaf: boolean;
};

type BootstrapState = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  activeProfile?: {
    actorId: string;
    displayName: string;
  };
  decision?: {
    completed: boolean;
    result: DecisionCode | null;
    selectedValueObjectId: string | null;
    resultSummaryRu: string | null;
    resultSummaryEn: string | null;
  };
  creation?: {
    completed: boolean;
    targetLeaf: CreationItem | null;
    history: CreationItem[];
  };
  existingLeaves?: Option[];
  privateParents?: Option[];
  systemParents?: Option[];
};

type Props = {
  signalId: string;
  locale: LocaleCode;
  parameterDefinitionId: string;
  parameterTitle: string;
  parameterCode: string;
  onChanged: () => void;
};

type Copy = {
  title: string;
  hint: string;
  existing: string;
  create: string;
  noAssign: string;
  clarify: string;
  comment: string;
  commentHint: string;
  existingObject: string;
  chooseExisting: string;
  saveDecision: string;
  saving: string;
  decisionDone: string;
  scopeTitle: string;
  scopeHint: string;
  privateLabel: string;
  privateHint: string;
  system: string;
  systemHint: string;
  activeProfile: string;
  roleTitle: string;
  roleHint: string;
  root: string;
  intermediate: string;
  leaf: string;
  rootHint: string;
  intermediateHint: string;
  leafHint: string;
  parent: string;
  chooseParent: string;
  privateTitle: string;
  privateDescription: string;
  canonicalKey: string;
  canonicalKeyHint: string;
  titleRu: string;
  descriptionRu: string;
  titleEn: string;
  descriptionEn: string;
  relation: string;
  chooseRelation: string;
  relationPartOf: string;
  relationIsA: string;
  relationAspectOf: string;
  relationSubprocessOf: string;
  createComment: string;
  createCommentHint: string;
  createObject: string;
  createdFinal: string;
  pathHistory: string;
  continuePath: string;
  openObject: string;
  openCatalog: string;
  loading: string;
  loadError: string;
  parameterContext: string;
};

const EN: Copy = {"title":"Determine the observation object for measurement","hint":"Determine which System leaf observation object has the value measured by this parameter. Only System observation objects are available in this curator workflow. If the path is missing, build it as root → intermediate → … → leaf.","existing":"Suitable leaf found","create":"A new leaf is required","noAssign":"The parameter should not be assigned to an observation object","clarify":"Clarification required","comment":"Decision comment","commentHint":"Briefly record why this option is correct.","existingObject":"Existing leaf","chooseExisting":"Choose an existing leaf…","saveDecision":"Record decision","saving":"Saving…","decisionDone":"Measurement-object decision recorded","scopeTitle":"Observation object access property","scopeHint":"Choose explicitly for every object. Nothing is preselected. Private is visible only to the current profile; System is created by the curator for all users after publication.","privateLabel":"Private","privateHint":"Created as an ordinary observation object of the current active profile. Only that user can see and use it.","system":"System","systemHint":"Created as an ownerless System draft. It remains hidden until a separate publication step.","activeProfile":"Current profile","roleTitle":"Structural role","roleHint":"The structural role describes the System ontology path: root → intermediate → … → leaf.","root":"Root","intermediate":"Intermediate","leaf":"Leaf","rootHint":"No parent. Starts a tree.","intermediateHint":"May have a root or another intermediate as parent.","leafHint":"Terminal object. Its parent must be intermediate.","parent":"Parent","chooseParent":"Choose a parent…","privateTitle":"Name","privateDescription":"Description","canonicalKey":"Canonical key","canonicalKeyHint":"For example: action.walking.step_count. Stable System identifier; immutable after creation.","titleRu":"RU name","descriptionRu":"RU definition","titleEn":"EN name","descriptionEn":"EN definition","relation":"Relation to parent","chooseRelation":"Choose the relation meaning…","relationPartOf":"Part of · part_of","relationIsA":"Is a · is_a","relationAspectOf":"Aspect of · aspect_of","relationSubprocessOf":"Subprocess of · subprocess_of","createComment":"Creation comment","createCommentHint":"Record why this access property, structural role, parent and meaning are correct.","createObject":"Create observation object","createdFinal":"Target leaf observation object created","pathHistory":"Objects created while building this path","continuePath":"The structural object was created. Continue the path until the required leaf is created.","openObject":"Open object","openCatalog":"Open observation objects","loading":"Loading the next step…","loadError":"Could not load or save the curator step.","parameterContext":"Parameter being configured"};

const RU: Copy = {"title":"Определение объекта наблюдения для измерения","hint":"Определите системный листовой объект наблюдения, значение которого измеряет этот параметр. В этом процессе куратора доступны только системные ОН. Если нужного пути нет, постройте его: корневой → промежуточный → … → листовой.","existing":"Подходящий листовой ОН найден","create":"Нужен новый листовой ОН","noAssign":"Параметр не должен назначаться объекту наблюдения","clarify":"Требуется уточнение","comment":"Комментарий к решению","commentHint":"Кратко зафиксируйте, почему выбран этот вариант.","existingObject":"Существующий листовой ОН","chooseExisting":"Выберите существующий листовой ОН…","saveDecision":"Зафиксировать решение","saving":"Сохраняем…","decisionDone":"Решение по объекту измерения зафиксировано","scopeTitle":"Свойство доступа ОН","scopeHint":"Выберите для каждого создаваемого ОН. Приватный доступен только текущему профилю; Системный создаёт куратор для всех пользователей после публикации.","privateLabel":"Приватный","privateHint":"Обычный ОН текущего активного профиля. Его видит и использует только этот пользователь.","system":"Системный","systemHint":"Системный черновик без владельца. До отдельной публикации скрыт.","activeProfile":"Текущий профиль","roleTitle":"Структурная роль","roleHint":"Структурная роль задаёт путь системной онтологии: корневой → промежуточный → … → листовой.","root":"Корневой","intermediate":"Промежуточный","leaf":"Листовой","rootHint":"Родителя нет. Начинает дерево.","intermediateHint":"Родителем может быть корень или другой промежуточный ОН.","leafHint":"Терминальный ОН. Родителем должен быть промежуточный ОН.","parent":"Родитель","chooseParent":"Выберите родительский ОН…","privateTitle":"Название","privateDescription":"Описание","canonicalKey":"Канонический ключ","canonicalKeyHint":"Например: action.walking.step_count. Стабильный системный идентификатор; после создания не меняется.","titleRu":"Название RU","descriptionRu":"Определение RU","titleEn":"Название EN","descriptionEn":"Определение EN","relation":"Связь с родителем","chooseRelation":"Выберите смысл связи…","relationPartOf":"Является частью · part_of","relationIsA":"Является видом · is_a","relationAspectOf":"Является аспектом · aspect_of","relationSubprocessOf":"Является подпроцессом · subprocess_of","createComment":"Комментарий к созданию","createCommentHint":"Зафиксируйте основание выбора свойства доступа, роли, родителя и смысла.","createObject":"Создать ОН","createdFinal":"Целевой листовой объект наблюдения создан","pathHistory":"ОН, созданные при построении пути","continuePath":"Структурный ОН создан. Продолжите путь до требуемого листового объекта.","openObject":"Открыть объект","openCatalog":"Открыть объекты наблюдения","loading":"Загружаем следующий шаг…","loadError":"Не удалось загрузить или сохранить шаг куратора.","parameterContext":"Настраиваемый параметр"};

const PL: Copy = {"title":"Określenie obiektu obserwacji dla pomiaru","hint":"Określ systemowy liściowy obiekt obserwacji, którego wartość mierzy ten parametr. W tym procesie kuratora dostępne są wyłącznie systemowe obiekty obserwacji. Jeśli ścieżki nie ma, zbuduj ją: korzeń → pośredni → … → liść.","existing":"Znaleziono odpowiedni obiekt liściowy","create":"Potrzebny jest nowy obiekt liściowy","noAssign":"Parametru nie należy przypisywać do obiektu obserwacji","clarify":"Wymagane doprecyzowanie","comment":"Komentarz do decyzji","commentHint":"Krótko zapisz, dlaczego ta opcja jest właściwa.","existingObject":"Istniejący obiekt liściowy","chooseExisting":"Wybierz istniejący obiekt liściowy…","saveDecision":"Zapisz decyzję","saving":"Zapisywanie…","decisionDone":"Zapisano decyzję dotyczącą obiektu pomiaru","scopeTitle":"Właściwość dostępu obiektu obserwacji","scopeHint":"Wybierz dla każdego obiektu. Prywatny jest dostępny tylko bieżącemu profilowi; Systemowy jest tworzony przez kuratora dla wszystkich użytkowników po publikacji.","privateLabel":"Prywatny","privateHint":"Zwykły obiekt obserwacji bieżącego aktywnego profilu. Widzi go i używa tylko ten użytkownik.","system":"Systemowy","systemHint":"Szkic systemowy bez właściciela. Ukryty do oddzielnej publikacji.","activeProfile":"Bieżący profil","roleTitle":"Rola strukturalna","roleHint":"Rola strukturalna określa ścieżkę ontologii systemowej: korzeń → pośredni → … → liść.","root":"Korzeń","intermediate":"Pośredni","leaf":"Liściowy","rootHint":"Nie ma rodzica. Rozpoczyna drzewo.","intermediateHint":"Rodzicem może być korzeń lub inny obiekt pośredni.","leafHint":"Obiekt końcowy. Rodzicem musi być obiekt pośredni.","parent":"Rodzic","chooseParent":"Wybierz rodzica…","privateTitle":"Nazwa","privateDescription":"Opis","canonicalKey":"Klucz kanoniczny","canonicalKeyHint":"Np. action.walking.step_count. Stabilny identyfikator systemowy; po utworzeniu niezmienny.","titleRu":"Nazwa RU","descriptionRu":"Definicja RU","titleEn":"Nazwa EN","descriptionEn":"Definicja EN","relation":"Relacja z rodzicem","chooseRelation":"Wybierz znaczenie relacji…","relationPartOf":"Jest częścią · part_of","relationIsA":"Jest rodzajem · is_a","relationAspectOf":"Jest aspektem · aspect_of","relationSubprocessOf":"Jest podprocesem · subprocess_of","createComment":"Komentarz do utworzenia","createCommentHint":"Zapisz podstawę wyboru dostępu, roli, rodzica i znaczenia.","createObject":"Utwórz obiekt obserwacji","createdFinal":"Utworzono docelowy liściowy obiekt obserwacji","pathHistory":"Obiekty utworzone podczas budowy ścieżki","continuePath":"Utworzono obiekt strukturalny. Kontynuuj ścieżkę do wymaganego liścia.","openObject":"Otwórz obiekt","openCatalog":"Otwórz obiekty obserwacji","loading":"Wczytywanie następnego kroku…","loadError":"Nie udało się wczytać lub zapisać kroku kuratora.","parameterContext":"Konfigurowany parametr"};

const UK: Copy = {"title":"Визначення об’єкта спостереження для вимірювання","hint":"Визначте системний листовий об’єкт спостереження, значення якого вимірює цей параметр. У цьому процесі куратора доступні лише системні об’єкти спостереження. Якщо потрібного шляху немає, побудуйте його: кореневий → проміжний → … → листовий.","existing":"Відповідний листовий об’єкт знайдено","create":"Потрібен новий листовий об’єкт","noAssign":"Параметр не слід призначати об’єкту спостереження","clarify":"Потрібне уточнення","comment":"Коментар до рішення","commentHint":"Коротко зафіксуйте, чому цей варіант правильний.","existingObject":"Наявний листовий об’єкт","chooseExisting":"Виберіть наявний листовий об’єкт…","saveDecision":"Зафіксувати рішення","saving":"Зберігаємо…","decisionDone":"Рішення щодо об’єкта вимірювання зафіксовано","scopeTitle":"Властивість доступу об’єкта спостереження","scopeHint":"Виберіть для кожного створюваного об’єкта. Приватний доступний лише поточному профілю; Системний створює куратор для всіх користувачів після публікації.","privateLabel":"Приватний","privateHint":"Звичайний об’єкт спостереження поточного активного профілю. Лише цей користувач може його бачити й використовувати.","system":"Системний","systemHint":"Системна чернетка без власника. До окремої публікації прихована.","activeProfile":"Поточний профіль","roleTitle":"Структурна роль","roleHint":"Структурна роль задає шлях системної онтології: кореневий → проміжний → … → листовий.","root":"Кореневий","intermediate":"Проміжний","leaf":"Листовий","rootHint":"Батьківського об’єкта немає. Починає дерево.","intermediateHint":"Батьківським може бути корінь або інший проміжний об’єкт.","leafHint":"Термінальний об’єкт. Батьківським має бути проміжний об’єкт.","parent":"Батьківський об’єкт","chooseParent":"Виберіть батьківський об’єкт…","privateTitle":"Назва","privateDescription":"Опис","canonicalKey":"Канонічний ключ","canonicalKeyHint":"Наприклад: action.walking.step_count. Стабільний системний ідентифікатор; після створення не змінюється.","titleRu":"Назва RU","descriptionRu":"Визначення RU","titleEn":"Назва EN","descriptionEn":"Визначення EN","relation":"Зв’язок із батьківським об’єктом","chooseRelation":"Виберіть зміст зв’язку…","relationPartOf":"Є частиною · part_of","relationIsA":"Є видом · is_a","relationAspectOf":"Є аспектом · aspect_of","relationSubprocessOf":"Є підпроцесом · subprocess_of","createComment":"Коментар до створення","createCommentHint":"Зафіксуйте підставу вибору властивості доступу, ролі, батьківського об’єкта та змісту.","createObject":"Створити об’єкт спостереження","createdFinal":"Цільовий листовий об’єкт спостереження створено","pathHistory":"Об’єкти, створені під час побудови шляху","continuePath":"Структурний об’єкт створено. Продовжуйте шлях до потрібного листового об’єкта.","openObject":"Відкрити об’єкт","openCatalog":"Відкрити об’єкти спостереження","loading":"Завантажуємо наступний крок…","loadError":"Не вдалося завантажити або зберегти крок куратора.","parameterContext":"Параметр, що налаштовується"};

const DE: Copy = {"title":"Beobachtungsobjekt für die Messung bestimmen","hint":"Bestimmen Sie das System-Blatt-Beobachtungsobjekt, dessen Wert dieser Parameter misst. In diesem Kuratoren-Workflow stehen ausschließlich System-Beobachtungsobjekte zur Verfügung. Fehlt der Pfad, bauen Sie ihn als Wurzel → Zwischenobjekt → … → Blatt auf.","existing":"Passendes Blatt gefunden","create":"Neues Blatt erforderlich","noAssign":"Der Parameter soll keinem Beobachtungsobjekt zugewiesen werden","clarify":"Klärung erforderlich","comment":"Entscheidungskommentar","commentHint":"Halten Sie kurz fest, warum diese Option richtig ist.","existingObject":"Vorhandenes Blatt","chooseExisting":"Vorhandenes Blatt auswählen…","saveDecision":"Entscheidung speichern","saving":"Speichern…","decisionDone":"Entscheidung zum Messobjekt gespeichert","scopeTitle":"Zugriffseigenschaft des Beobachtungsobjekts","scopeHint":"Für jedes Objekt auswählen. Privat ist nur für das aktuelle Profil verfügbar; System wird vom Kurator für alle Benutzer nach Veröffentlichung erstellt.","privateLabel":"Privat","privateHint":"Normales Beobachtungsobjekt des aktuellen Profils. Nur dieser Benutzer kann es sehen und verwenden.","system":"System","systemHint":"Besitzerloser Systementwurf. Bis zur gesonderten Veröffentlichung verborgen.","activeProfile":"Aktuelles Profil","roleTitle":"Strukturelle Rolle","roleHint":"Die strukturelle Rolle beschreibt den Pfad der Systemontologie: Wurzel → Zwischenobjekt → … → Blatt.","root":"Wurzel","intermediate":"Zwischenobjekt","leaf":"Blatt","rootHint":"Kein Elternobjekt. Beginnt einen Baum.","intermediateHint":"Elternobjekt kann Wurzel oder Zwischenobjekt sein.","leafHint":"Terminales Objekt. Elternobjekt muss ein Zwischenobjekt sein.","parent":"Elternobjekt","chooseParent":"Elternobjekt auswählen…","privateTitle":"Name","privateDescription":"Beschreibung","canonicalKey":"Kanonischer Schlüssel","canonicalKeyHint":"Z. B. action.walking.step_count. Stabiler Systembezeichner; nach Erstellung unveränderlich.","titleRu":"RU-Name","descriptionRu":"RU-Definition","titleEn":"EN-Name","descriptionEn":"EN-Definition","relation":"Beziehung zum Elternobjekt","chooseRelation":"Bedeutung der Beziehung auswählen…","relationPartOf":"Teil von · part_of","relationIsA":"Ist ein · is_a","relationAspectOf":"Aspekt von · aspect_of","relationSubprocessOf":"Unterprozess von · subprocess_of","createComment":"Erstellungskommentar","createCommentHint":"Begründen Sie Zugriff, Rolle, Elternobjekt und Bedeutung.","createObject":"Beobachtungsobjekt erstellen","createdFinal":"Ziel-Blatt-Beobachtungsobjekt erstellt","pathHistory":"Beim Aufbau des Pfads erstellte Objekte","continuePath":"Strukturelles Objekt erstellt. Setzen Sie den Pfad bis zum erforderlichen Blatt fort.","openObject":"Objekt öffnen","openCatalog":"Beobachtungsobjekte öffnen","loading":"Nächster Schritt wird geladen…","loadError":"Kuratorenschritt konnte nicht geladen oder gespeichert werden.","parameterContext":"Konfigurierter Parameter"};

const ES: Copy = {"title":"Determinar el objeto de observación para la medición","hint":"Determine el objeto de observación hoja del sistema cuyo valor mide este parámetro. En este flujo del curador solo están disponibles objetos de observación del sistema. Si falta la ruta, constrúyala como raíz → intermedio → … → hoja.","existing":"Se encontró una hoja adecuada","create":"Se necesita una nueva hoja","noAssign":"El parámetro no debe asignarse a un objeto de observación","clarify":"Se requiere aclaración","comment":"Comentario de la decisión","commentHint":"Indique brevemente por qué esta opción es correcta.","existingObject":"Hoja existente","chooseExisting":"Elegir una hoja existente…","saveDecision":"Registrar decisión","saving":"Guardando…","decisionDone":"Decisión sobre el objeto de medición registrada","scopeTitle":"Propiedad de acceso del objeto de observación","scopeHint":"Elíjala para cada objeto. Privado solo está disponible para el perfil actual; Sistema lo crea el curador para todos los usuarios después de la publicación.","privateLabel":"Privado","privateHint":"Objeto de observación normal del perfil activo actual. Solo ese usuario puede verlo y utilizarlo.","system":"Sistema","systemHint":"Borrador del sistema sin propietario. Oculto hasta una publicación separada.","activeProfile":"Perfil actual","roleTitle":"Función estructural","roleHint":"La función estructural define la ruta de la ontología del sistema: raíz → intermedio → … → hoja.","root":"Raíz","intermediate":"Intermedio","leaf":"Hoja","rootHint":"Sin padre. Inicia un árbol.","intermediateHint":"El padre puede ser raíz u otro objeto intermedio.","leafHint":"Objeto terminal. Su padre debe ser intermedio.","parent":"Padre","chooseParent":"Elegir padre…","privateTitle":"Nombre","privateDescription":"Descripción","canonicalKey":"Clave canónica","canonicalKeyHint":"Ej.: action.walking.step_count. Identificador estable del sistema; no cambia tras crearlo.","titleRu":"Nombre RU","descriptionRu":"Definición RU","titleEn":"Nombre EN","descriptionEn":"Definición EN","relation":"Relación con el padre","chooseRelation":"Elegir el significado de la relación…","relationPartOf":"Es parte de · part_of","relationIsA":"Es un tipo de · is_a","relationAspectOf":"Es un aspecto de · aspect_of","relationSubprocessOf":"Es un subproceso de · subprocess_of","createComment":"Comentario de creación","createCommentHint":"Registre el motivo del acceso, función, padre y significado.","createObject":"Crear objeto de observación","createdFinal":"Objeto de observación hoja objetivo creado","pathHistory":"Objetos creados al construir la ruta","continuePath":"Se creó el objeto estructural. Continúe la ruta hasta la hoja requerida.","openObject":"Abrir objeto","openCatalog":"Abrir objetos de observación","loading":"Cargando el siguiente paso…","loadError":"No se pudo cargar o guardar el paso del curador.","parameterContext":"Parámetro en configuración"};

const CS: Copy = {"title":"Určení objektu pozorování pro měření","hint":"Určete systémový listový objekt pozorování, jehož hodnotu tento parametr měří. V tomto pracovním postupu kurátora jsou dostupné pouze systémové objekty pozorování. Pokud cesta chybí, vytvořte ji jako kořen → mezilehlý → … → list.","existing":"Nalezen vhodný list","create":"Je potřeba nový list","noAssign":"Parametr nemá být přiřazen objektu pozorování","clarify":"Je třeba upřesnění","comment":"Komentář k rozhodnutí","commentHint":"Stručně zaznamenejte, proč je tato možnost správná.","existingObject":"Existující list","chooseExisting":"Vyberte existující list…","saveDecision":"Zaznamenat rozhodnutí","saving":"Ukládání…","decisionDone":"Rozhodnutí o objektu měření zaznamenáno","scopeTitle":"Vlastnost přístupu objektu pozorování","scopeHint":"Vyberte pro každý objekt. Soukromý je dostupný jen aktuálnímu profilu; Systémový vytváří kurátor pro všechny uživatele po zveřejnění.","privateLabel":"Soukromý","privateHint":"Běžný objekt pozorování aktuálního profilu. Vidí a používá ho jen tento uživatel.","system":"Systémový","systemHint":"Systémový koncept bez vlastníka. Skrytý do samostatného zveřejnění.","activeProfile":"Aktuální profil","roleTitle":"Strukturální role","roleHint":"Strukturální role určuje cestu systémové ontologie: kořen → mezilehlý → … → list.","root":"Kořen","intermediate":"Mezilehlý","leaf":"List","rootHint":"Nemá rodiče. Začíná strom.","intermediateHint":"Rodičem může být kořen nebo jiný mezilehlý objekt.","leafHint":"Koncový objekt. Rodičem musí být mezilehlý objekt.","parent":"Rodič","chooseParent":"Vyberte rodiče…","privateTitle":"Název","privateDescription":"Popis","canonicalKey":"Kanonický klíč","canonicalKeyHint":"Např. action.walking.step_count. Stabilní systémový identifikátor; po vytvoření se nemění.","titleRu":"Název RU","descriptionRu":"Definice RU","titleEn":"Název EN","descriptionEn":"Definice EN","relation":"Vztah k rodiči","chooseRelation":"Vyberte význam vztahu…","relationPartOf":"Je součástí · part_of","relationIsA":"Je typem · is_a","relationAspectOf":"Je aspektem · aspect_of","relationSubprocessOf":"Je podprocesem · subprocess_of","createComment":"Komentář k vytvoření","createCommentHint":"Zaznamenejte důvod přístupu, role, rodiče a významu.","createObject":"Vytvořit objekt pozorování","createdFinal":"Cílový listový objekt pozorování vytvořen","pathHistory":"Objekty vytvořené při budování cesty","continuePath":"Strukturální objekt byl vytvořen. Pokračujte až k požadovanému listu.","openObject":"Otevřít objekt","openCatalog":"Otevřít objekty pozorování","loading":"Načítání dalšího kroku…","loadError":"Krok kurátora se nepodařilo načíst nebo uložit.","parameterContext":"Nastavovaný parametr"};

const COPY: Record<LocaleCode, Copy> = {
  en: EN,
  ru: RU,
  pl: PL,
  uk: UK,
  de: DE,
  es: ES,
  cs: CS,
};

function localized(ru: string | null | undefined, en: string | null | undefined, locale: LocaleCode) {
  return locale === "ru" ? ru || en || "" : en || ru || "";
}

function localeHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") return pathname;
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}locale=${encodeURIComponent(locale)}`;
}

function roleLabel(role: NodeRoleCode | null, copy: Copy) {
  if (role === "root") return copy.root;
  if (role === "intermediate") return copy.intermediate;
  if (role === "leaf") return copy.leaf;
  return "—";
}

type LocalizedFieldLabels = {
  title: string;
  description: string;
  titleEn: string;
  descriptionEn: string;
};

const LOCALIZED_FIELD_LABELS: Record<LocaleCode, LocalizedFieldLabels> = {"en":{"title":"Name","description":"Definition","titleEn":"English name","descriptionEn":"English definition"},"ru":{"title":"Название","description":"Определение","titleEn":"Название на английском","descriptionEn":"Определение на английском"},"pl":{"title":"Nazwa","description":"Definicja","titleEn":"Nazwa angielska","descriptionEn":"Definicja angielska"},"uk":{"title":"Назва","description":"Визначення","titleEn":"Англійська назва","descriptionEn":"Англійське визначення"},"de":{"title":"Name","description":"Definition","titleEn":"Englischer Name","descriptionEn":"Englische Definition"},"es":{"title":"Nombre","description":"Definición","titleEn":"Nombre en inglés","descriptionEn":"Definición en inglés"},"cs":{"title":"Název","description":"Definice","titleEn":"Anglický název","descriptionEn":"Anglická definice"}};

export function CuratorObjectBootstrap({
  signalId,
  locale,
  parameterDefinitionId,
  parameterTitle,
  parameterCode,
  onChanged,
}: Props) {
  const copy = COPY[locale] ?? COPY.en;
  const fieldLabels = LOCALIZED_FIELD_LABELS[locale] ?? LOCALIZED_FIELD_LABELS.en;
  const [state, setState] = useState<BootstrapState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<DecisionCode | "">("");
  const [decisionComment, setDecisionComment] = useState("");
  const [existingId, setExistingId] = useState("");
  const scope: ScopeCode = "system";
  const [nodeRole, setNodeRole] = useState<NodeRoleCode | null>(null);
  const [parentId, setParentId] = useState("");
  const [canonicalKey, setCanonicalKey] = useState("");
  const [localizedTitle, setLocalizedTitle] = useState("");
  const [localizedDescription, setLocalizedDescription] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [relation, setRelation] = useState("");
  const [creationComment, setCreationComment] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const requestUrl =
      `/api/admin/reality-curator/signals/object-bootstrap?signalId=${encodeURIComponent(signalId)}&locale=${encodeURIComponent(locale)}&parameterDefinitionId=${encodeURIComponent(parameterDefinitionId)}`;

    void fetch(requestUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as BootstrapState | null;

        if (!response.ok || !payload?.ok) {
          throw new Error(
            payload?.error || payload?.errorCode || `HTTP_${response.status}`,
          );
        }

        setState(payload);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(cause instanceof Error ? cause.message : "UNKNOWN");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [locale, parameterDefinitionId, signalId]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/reality-curator/signals/object-bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalId,
          locale,
          parameterDefinitionId,
          ...body,
        }),
      });
      const payload = (await response.json().catch(() => null)) as BootstrapState | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || payload?.errorCode || `HTTP_${response.status}`);
      }
      setState(payload);
      setParentId("");
      setRelation("");
      setCreationComment("");
      setCanonicalKey("");
      setLocalizedTitle("");
      setLocalizedDescription("");
      setTitleEn("");
      setDescriptionEn("");
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "UNKNOWN");
    } finally {
      setBusy(false);
    }
  }

  const existingLeaves = state?.existingLeaves ?? [];
  const allParents = state?.systemParents ?? [];
  const parents =
    nodeRole === "leaf"
      ? allParents.filter((item) => item.nodeRole === "intermediate")
      : nodeRole === "intermediate"
        ? allParents.filter(
            (item) =>
              item.nodeRole === "root" || item.nodeRole === "intermediate",
          )
        : [];
  const selectedParent = parents.find((item) => item.id === parentId) ?? null;
  const systemKeyValid = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(
    canonicalKey.trim(),
  );

  const canCreate = (() => {
    if (!nodeRole || !creationComment.trim()) return false;

    if (nodeRole !== "root") {
      if (!parentId || !relation) return false;
      if (nodeRole === "leaf" && selectedParent?.nodeRole !== "intermediate") {
        return false;
      }
      if (nodeRole === "intermediate" && !selectedParent) return false;
    }

    return Boolean(
      systemKeyValid &&
        localizedTitle.trim() &&
        localizedDescription.trim() &&
        (locale === "en" || (titleEn.trim() && descriptionEn.trim())),
    );
  })();

  if (loading) {
    return <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4 text-sm text-[#727991]">{copy.loading}</div>;
  }

  if (!state) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{copy.loadError} {error}</div>;
  }

  if (!state.decision?.completed) {
    const decisionValid = Boolean(
      decision &&
      decisionComment.trim() &&
      (decision !== "existing_leaf_found" || existingId),
    );
    return (
      <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
        <div className="mb-3 rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-xs text-[#5f6679]">
          <span className="font-extrabold text-[#34405a]">{copy.parameterContext}: </span>
          <span className="font-bold text-[#263044]">{parameterTitle}</span>
          <span className="ml-1 font-mono text-[#65708d]">· {parameterCode}</span>
        </div>
        <div className="text-sm font-extrabold text-[#263044]">{copy.title}</div>
        <div className="mt-1 text-xs leading-5 text-[#727991]">{copy.hint}</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {([
            ["existing_leaf_found", copy.existing],
            ["new_leaf_required", copy.create],
            ["parameter_not_assigned", copy.noAssign],
            ["needs_clarification", copy.clarify],
          ] as const).map(([code, label]) => (
            <button key={code} type="button" disabled={busy} onClick={() => setDecision(code)} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-bold ${decision === code ? "border-[#3b6ef8] bg-[#eef3ff] text-[#234aa8]" : "border-[#d8def0] bg-white text-[#34405a]"}`}>
              {label}
            </button>
          ))}
        </div>
        {decision === "existing_leaf_found" ? (
          <label className="mt-3 block text-xs font-bold text-[#4b5563]">
            {copy.existingObject}
            <select value={existingId} onChange={(event) => setExistingId(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
              <option value="">{copy.chooseExisting}</option>
              {existingLeaves.map((item) => <option key={item.id} value={item.id}>{item.title} · {copy.system}</option>)}
            </select>
          </label>
        ) : null}
        <label className="mt-3 block">
          <div className="mb-1 text-xs font-bold text-[#4b5563]">{copy.comment}</div>
          <textarea value={decisionComment} onChange={(event) => setDecisionComment(event.target.value.slice(0, 1500))} placeholder={copy.commentHint} rows={3} className="w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none" />
          <div className="mt-1 text-right text-[10px] text-[#9ca3b8]">{decisionComment.length}/1500</div>
        </label>
        <button type="button" disabled={busy || !decisionValid} onClick={() => void post({ action: "record_object_decision", result: decision, selectedValueObjectId: existingId || null, comment: decisionComment })} className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
          {busy ? copy.saving : copy.saveDecision}
        </button>
        {error ? <div className="mt-2 text-xs text-red-700">{copy.loadError} {error}</div> : null}
      </div>
    );
  }

  if (state.decision.result !== "new_leaf_required") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="text-sm font-extrabold text-emerald-900">{copy.decisionDone}</div>
        <div className="mt-1 text-sm leading-5 text-emerald-800">{localized(state.decision.resultSummaryRu, state.decision.resultSummaryEn, locale)}</div>
      </div>
    );
  }

  const history = state.creation?.history ?? [];
  const targetLeaf = state.creation?.targetLeaf ?? null;

  if (state.creation?.completed && targetLeaf?.valueObjectId) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="text-sm font-extrabold text-emerald-900">{copy.createdFinal}</div>
        <div className="mt-1 text-sm leading-5 text-emerald-800">
          {localized(targetLeaf.resultSummaryRu, targetLeaf.resultSummaryEn, locale)}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={localeHref(`/value-objects/${targetLeaf.valueObjectId}`, locale)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-xl border border-emerald-300 bg-white px-3 text-sm font-bold text-emerald-900">
            {copy.openObject}
          </Link>
          <Link href={localeHref("/value-objects", locale)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-xl border border-[#cfd8ef] bg-white px-3 text-sm font-bold text-[#34405a]">
            {copy.openCatalog}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
      <div className="mb-4 rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-xs text-[#5f6679]">
        <span className="font-extrabold text-[#34405a]">{copy.parameterContext}: </span>
        <span className="font-bold text-[#263044]">{parameterTitle}</span>
        <span className="ml-1 font-mono text-[#65708d]">· {parameterCode}</span>
      </div>
      {history.length ? (
        <div className="mb-4 rounded-xl border border-[#d8def0] bg-white p-3">
          <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#65708d]">{copy.pathHistory}</div>
          <div className="mt-2 space-y-2">
            {history.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="font-bold text-[#263044]">{item.title || item.canonicalKey || item.valueObjectId} · {roleLabel(item.nodeRole, copy)} · {item.scope === "system" ? copy.system : copy.privateLabel}</div>
                {item.valueObjectId ? <Link href={localeHref(`/value-objects/${item.valueObjectId}`, locale)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#3b6ef8]">{copy.openObject}</Link> : null}
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-[#727991]">{copy.continuePath}</div>
        </div>
      ) : null}

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
        <div className="text-sm font-extrabold text-emerald-900">{copy.system}</div>
        <div className="mt-1 text-xs leading-5 text-emerald-800">{copy.systemHint}</div>
      </div>

      {scope ? (
        <>
          <div className="mt-4 text-sm font-extrabold text-[#263044]">{copy.roleTitle}</div>
          <div className="mt-1 text-xs leading-5 text-[#727991]">{copy.roleHint}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {([
              ["root", copy.root, copy.rootHint],
              ["intermediate", copy.intermediate, copy.intermediateHint],
              ["leaf", copy.leaf, copy.leafHint],
            ] as const).map(([code, label, hint]) => (
              <button key={code} type="button" disabled={busy} onClick={() => { setNodeRole(code); setParentId(""); setRelation(""); }} className={`rounded-xl border p-3 text-left ${nodeRole === code ? "border-[#3b6ef8] bg-[#eef3ff]" : "border-[#d8def0] bg-white"}`}>
                <div className="text-sm font-extrabold text-[#263044]">{label}</div>
                <div className="mt-1 text-xs leading-5 text-[#727991]">{hint}</div>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {scope && nodeRole ? (
        <div className="mt-4 space-y-3">
          {nodeRole !== "root" ? (
            <label className="block text-xs font-bold text-[#4b5563]">
              {copy.parent}
              <select value={parentId} onChange={(event) => setParentId(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                <option value="">{copy.chooseParent}</option>
                {parents.map((item) => <option key={item.id} value={item.id}>{item.title} · {roleLabel(item.nodeRole, copy)}{item.status === "draft" ? " · draft" : ""}</option>)}
              </select>
            </label>
          ) : null}


          <>
            <label className="block text-xs font-bold text-[#4b5563]">{copy.canonicalKey}<input value={canonicalKey} onChange={(event) => setCanonicalKey(event.target.value.toLowerCase().slice(0, 160))} placeholder="action.walking.step_count" className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 font-mono text-sm outline-none" /><span className="mt-1 block font-normal text-[#7c8099]">{copy.canonicalKeyHint}</span></label>
            <div className={`grid gap-3 ${locale === "en" ? "" : "sm:grid-cols-2"}`}>
              <label className="block text-xs font-bold text-[#4b5563]">{fieldLabels.title}<input value={localizedTitle} onChange={(event) => setLocalizedTitle(event.target.value.slice(0, 180))} className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none" /></label>
              {locale !== "en" ? <label className="block text-xs font-bold text-[#4b5563]">{fieldLabels.titleEn}<input value={titleEn} onChange={(event) => setTitleEn(event.target.value.slice(0, 180))} className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none" /></label> : null}
              <label className="block text-xs font-bold text-[#4b5563]">{fieldLabels.description}<textarea value={localizedDescription} onChange={(event) => setLocalizedDescription(event.target.value.slice(0, 4000))} rows={3} className="mt-1 w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none" /></label>
              {locale !== "en" ? <label className="block text-xs font-bold text-[#4b5563]">{fieldLabels.descriptionEn}<textarea value={descriptionEn} onChange={(event) => setDescriptionEn(event.target.value.slice(0, 4000))} rows={3} className="mt-1 w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none" /></label> : null}
            </div>
          </>

          {nodeRole !== "root" ? (
            <label className="block text-xs font-bold text-[#4b5563]">{copy.relation}<select value={relation} onChange={(event) => setRelation(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none"><option value="">{copy.chooseRelation}</option><option value="part_of">{copy.relationPartOf}</option><option value="is_a">{copy.relationIsA}</option><option value="aspect_of">{copy.relationAspectOf}</option><option value="subprocess_of">{copy.relationSubprocessOf}</option></select></label>
          ) : null}

          <label className="block">
            <div className="mb-1 text-xs font-bold text-[#4b5563]">{copy.createComment}</div>
            <textarea value={creationComment} onChange={(event) => setCreationComment(event.target.value.slice(0, 1500))} placeholder={copy.createCommentHint} rows={3} className="w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none" />
            <div className="mt-1 text-right text-[10px] text-[#9ca3b8]">{creationComment.length}/1500</div>
          </label>
          <button
            type="button"
            disabled={busy || !canCreate}
            onClick={() => void post({
              action: "create_observation_object",
              scope: "system",
              nodeRole,
              parentValueObjectId: nodeRole === "root" ? null : parentId,
              canonicalKey,
              localizedTitle,
              localizedDescription,
              titleEn: locale === "en" ? localizedTitle : titleEn,
              descriptionEn: locale === "en" ? localizedDescription : descriptionEn,
              hierarchyRelationCode: nodeRole === "root" ? null : relation,
              comment: creationComment,
            })}
            className="inline-flex min-h-10 items-center rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? copy.saving : `${copy.createObject}: ${roleLabel(nodeRole, copy)}`}
          </button>
        </div>
      ) : null}
      {error ? <div className="mt-2 text-xs text-red-700">{copy.loadError} {error}</div> : null}
    </div>
  );
}
