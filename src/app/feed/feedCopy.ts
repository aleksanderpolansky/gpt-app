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
    subtitle: "Public updates from ARCTor profiles and enterprises.",
    loading: "Loading updates…",
    translating: "Translating into English…",
    empty: "No public updates yet.",
    loadError: "The feed could not be loaded.",
    sourceLabel: "ARCTor",
    openProfile: "Open profile",
  },
  pl: {
    title: "Aktualności ARCTor",
    subtitle: "Publiczne aktualności profili i przedsiębiorstw w ARCTor.",
    loading: "Ładowanie aktualności…",
    translating: "Tłumaczenie na język polski…",
    empty: "Nie ma jeszcze publicznych aktualności.",
    loadError: "Nie udało się wczytać aktualności.",
    sourceLabel: "ARCTor",
    openProfile: "Otwórz profil",
  },
  ru: {
    title: "Лента ARCTor",
    subtitle: "Публичные публикации профилей и предприятий в ARCTor.",
    loading: "Загрузка ленты…",
    translating: "Переводится на русский…",
    empty: "Публичных публикаций пока нет.",
    loadError: "Не удалось загрузить ленту.",
    sourceLabel: "ARCTor",
    openProfile: "Открыть профиль",
  },
  uk: {
    title: "Стрічка ARCTor",
    subtitle: "Публічні публікації профілів і підприємств в ARCTor.",
    loading: "Завантаження стрічки…",
    translating: "Перекладається українською…",
    empty: "Публічних публікацій поки немає.",
    loadError: "Не вдалося завантажити стрічку.",
    sourceLabel: "ARCTor",
    openProfile: "Відкрити профіль",
  },
  de: {
    title: "ARCTor Neuigkeiten",
    subtitle: "Öffentliche Beiträge von Profilen und Unternehmen in ARCTor.",
    loading: "Neuigkeiten werden geladen…",
    translating: "Wird ins Deutsche übersetzt…",
    empty: "Noch keine öffentlichen Beiträge.",
    loadError: "Die Neuigkeiten konnten nicht geladen werden.",
    sourceLabel: "ARCTor",
    openProfile: "Profil öffnen",
  },
  es: {
    title: "Novedades de ARCTor",
    subtitle: "Publicaciones públicas de perfiles y empresas en ARCTor.",
    loading: "Cargando novedades…",
    translating: "Traduciendo al español…",
    empty: "Todavía no hay publicaciones públicas.",
    loadError: "No se pudieron cargar las novedades.",
    sourceLabel: "ARCTor",
    openProfile: "Abrir perfil",
  },
  cs: {
    title: "Aktuality ARCTor",
    subtitle: "Veřejné příspěvky profilů a podniků v ARCTor.",
    loading: "Načítání aktualit…",
    translating: "Překládá se do češtiny…",
    empty: "Zatím nejsou žádné veřejné příspěvky.",
    loadError: "Aktuality se nepodařilo načíst.",
    sourceLabel: "ARCTor",
    openProfile: "Otevřít profil",
  },
};

export function getGlobalFeedCopy(locale: LocaleCode): GlobalFeedCopy {
  return COPY[locale];
}
