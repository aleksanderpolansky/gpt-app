import type { LocaleCode } from "@/i18n";

export type GlobalFeedCopy = {
  title: string;
  subtitle: string;
  loading: string;
  translating: string;
  empty: string;
  loadError: string;
  sourceLabel: string;
  openProfile: string;
};

const COPY: Record<LocaleCode, GlobalFeedCopy> = {
  en: {
    title: "ARCTor Feed",
    subtitle: "Public updates from enterprises in ARCTor.",
    loading: "Loading updates…",
    translating: "Translating into English…",
    empty: "No public updates yet.",
    loadError: "The feed could not be loaded.",
    sourceLabel: "ARCTor",
    openProfile: "Open enterprise profile",
  },
  pl: {
    title: "Aktualności ARCTor",
    subtitle: "Publiczne aktualności przedsiębiorstw w ARCTor.",
    loading: "Ładowanie aktualności…",
    translating: "Tłumaczenie na język polski…",
    empty: "Nie ma jeszcze publicznych aktualności.",
    loadError: "Nie udało się wczytać aktualności.",
    sourceLabel: "ARCTor",
    openProfile: "Otwórz profil firmy",
  },
  ru: {
    title: "Лента ARCTor",
    subtitle: "Публичные новости и публикации предприятий в ARCTor.",
    loading: "Загрузка ленты…",
    translating: "Переводится на русский…",
    empty: "Публичных публикаций пока нет.",
    loadError: "Не удалось загрузить ленту.",
    sourceLabel: "ARCTor",
    openProfile: "Открыть профиль предприятия",
  },
  uk: {
    title: "Стрічка ARCTor",
    subtitle: "Публічні новини та публікації підприємств в ARCTor.",
    loading: "Завантаження стрічки…",
    translating: "Перекладається українською…",
    empty: "Публічних публікацій поки немає.",
    loadError: "Не вдалося завантажити стрічку.",
    sourceLabel: "ARCTor",
    openProfile: "Відкрити профіль підприємства",
  },
  de: {
    title: "ARCTor Neuigkeiten",
    subtitle: "Öffentliche Neuigkeiten von Unternehmen in ARCTor.",
    loading: "Neuigkeiten werden geladen…",
    translating: "Wird ins Deutsche übersetzt…",
    empty: "Noch keine öffentlichen Neuigkeiten.",
    loadError: "Die Neuigkeiten konnten nicht geladen werden.",
    sourceLabel: "ARCTor",
    openProfile: "Unternehmensprofil öffnen",
  },
  es: {
    title: "Novedades de ARCTor",
    subtitle: "Novedades públicas de empresas en ARCTor.",
    loading: "Cargando novedades…",
    translating: "Traduciendo al español…",
    empty: "Todavía no hay novedades públicas.",
    loadError: "No se pudieron cargar las novedades.",
    sourceLabel: "ARCTor",
    openProfile: "Abrir el perfil de la empresa",
  },
  cs: {
    title: "Aktuality ARCTor",
    subtitle: "Veřejné aktuality podniků v ARCTor.",
    loading: "Načítání aktualit…",
    translating: "Překládá se do češtiny…",
    empty: "Zatím nejsou žádné veřejné aktuality.",
    loadError: "Aktuality se nepodařilo načíst.",
    sourceLabel: "ARCTor",
    openProfile: "Otevřít profil podniku",
  },
};

export function getGlobalFeedCopy(locale: LocaleCode): GlobalFeedCopy {
  return COPY[locale];
}
