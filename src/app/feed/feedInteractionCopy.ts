import type { LocaleCode } from "@/i18n";

export type FeedInteractionCopy = {
  newPublication: string;
  publicationPlaceholder: string;
  publish: string;
  publishing: string;
  published: string;
  photo: string;
  removePhoto: string;
  optimizingPhoto: string;
  imageTypeUnsupported: string;
  imageSourceTooLarge: string;
  imageOptimizationFailed: string;
  imageServerRejected: string;
  hidePublication: string;
  hidingPublication: string;
  restorePublication: string;
  restoringPublication: string;
  hiddenTitle: string;
  hiddenSubtitle: string;
  hiddenEmpty: string;
  signInRequired: string;
};

const COPY: Record<LocaleCode, FeedInteractionCopy> = {
  en: {
    newPublication: "New publication",
    publicationPlaceholder: "Share a public update…",
    publish: "Publish",
    publishing: "Publishing…",
    published: "Published.",
    photo: "Photo",
    removePhoto: "Remove photo",
    optimizingPhoto: "Optimizing photo…",
    imageTypeUnsupported: "Choose a JPEG, PNG or WebP image.",
    imageSourceTooLarge: "The selected image is larger than 10 MiB.",
    imageOptimizationFailed: "The photo could not be optimized for publication.",
    imageServerRejected: "The optimized photo was rejected by the server.",
    hidePublication: "Hide",
    hidingPublication: "Hiding…",
    restorePublication: "Restore",
    restoringPublication: "Restoring…",
    hiddenTitle: "My hidden publications",
    hiddenSubtitle: "Publications hidden for the currently active ARCTor profile.",
    hiddenEmpty: "No hidden publications for this profile.",
    signInRequired: "Sign in to view hidden publications.",
  },
  pl: {
    newPublication: "Nowa publikacja",
    publicationPlaceholder: "Udostępnij publiczną aktualizację…",
    publish: "Opublikuj",
    publishing: "Publikowanie…",
    published: "Opublikowano.",
    photo: "Zdjęcie",
    removePhoto: "Usuń zdjęcie",
    optimizingPhoto: "Optymalizacja zdjęcia…",
    imageTypeUnsupported: "Wybierz obraz JPEG, PNG lub WebP.",
    imageSourceTooLarge: "Wybrany obraz jest większy niż 10 MiB.",
    imageOptimizationFailed: "Nie udało się zoptymalizować zdjęcia do publikacji.",
    imageServerRejected: "Serwer odrzucił zoptymalizowane zdjęcie.",
    hidePublication: "Ukryj",
    hidingPublication: "Ukrywanie…",
    restorePublication: "Przywróć",
    restoringPublication: "Przywracanie…",
    hiddenTitle: "Moje ukryte publikacje",
    hiddenSubtitle: "Publikacje ukryte dla aktualnie aktywnego profilu ARCTor.",
    hiddenEmpty: "Brak ukrytych publikacji dla tego profilu.",
    signInRequired: "Zaloguj się, aby zobaczyć ukryte publikacje.",
  },
  ru: {
    newPublication: "Новая публикация",
    publicationPlaceholder: "Поделитесь публичным обновлением…",
    publish: "Опубликовать",
    publishing: "Публикация…",
    published: "Опубликовано.",
    photo: "Фото",
    removePhoto: "Удалить фото",
    optimizingPhoto: "Оптимизация фото…",
    imageTypeUnsupported: "Выберите изображение JPEG, PNG или WebP.",
    imageSourceTooLarge: "Выбранное изображение больше 10 MiB.",
    imageOptimizationFailed: "Не удалось оптимизировать фото для публикации.",
    imageServerRejected: "Сервер отклонил оптимизированное фото.",
    hidePublication: "Скрыть",
    hidingPublication: "Скрытие…",
    restorePublication: "Восстановить",
    restoringPublication: "Восстановление…",
    hiddenTitle: "Мои скрытые публикации",
    hiddenSubtitle: "Публикации, скрытые для текущего активного профиля ARCTor.",
    hiddenEmpty: "Для этого профиля нет скрытых публикаций.",
    signInRequired: "Войдите, чтобы увидеть скрытые публикации.",
  },
  uk: {
    newPublication: "Нова публікація",
    publicationPlaceholder: "Поділіться публічним оновленням…",
    publish: "Опублікувати",
    publishing: "Публікація…",
    published: "Опубліковано.",
    photo: "Фото",
    removePhoto: "Видалити фото",
    optimizingPhoto: "Оптимізація фото…",
    imageTypeUnsupported: "Виберіть JPEG, PNG або WebP.",
    imageSourceTooLarge: "Вибране зображення перевищує 10 MiB.",
    imageOptimizationFailed: "Не вдалося оптимізувати фото для публікації.",
    imageServerRejected: "Сервер відхилив оптимізоване фото.",
    hidePublication: "Сховати",
    hidingPublication: "Приховування…",
    restorePublication: "Відновити",
    restoringPublication: "Відновлення…",
    hiddenTitle: "Мої приховані публікації",
    hiddenSubtitle: "Публікації, приховані для поточного активного профілю ARCTor.",
    hiddenEmpty: "Для цього профілю немає прихованих публікацій.",
    signInRequired: "Увійдіть, щоб переглянути приховані публікації.",
  },
  de: {
    newPublication: "Neue Veröffentlichung",
    publicationPlaceholder: "Teile ein öffentliches Update…",
    publish: "Veröffentlichen",
    publishing: "Wird veröffentlicht…",
    published: "Veröffentlicht.",
    photo: "Foto",
    removePhoto: "Foto entfernen",
    optimizingPhoto: "Foto wird optimiert…",
    imageTypeUnsupported: "Wähle ein JPEG-, PNG- oder WebP-Bild.",
    imageSourceTooLarge: "Das ausgewählte Bild ist größer als 10 MiB.",
    imageOptimizationFailed: "Das Foto konnte nicht optimiert werden.",
    imageServerRejected: "Der Server hat das optimierte Foto abgelehnt.",
    hidePublication: "Ausblenden",
    hidingPublication: "Wird ausgeblendet…",
    restorePublication: "Wiederherstellen",
    restoringPublication: "Wird wiederhergestellt…",
    hiddenTitle: "Meine ausgeblendeten Veröffentlichungen",
    hiddenSubtitle: "Für das aktuell aktive ARCTor-Profil ausgeblendete Veröffentlichungen.",
    hiddenEmpty: "Für dieses Profil gibt es keine ausgeblendeten Veröffentlichungen.",
    signInRequired: "Melde dich an, um ausgeblendete Veröffentlichungen zu sehen.",
  },
  es: {
    newPublication: "Nueva publicación",
    publicationPlaceholder: "Comparte una actualización pública…",
    publish: "Publicar",
    publishing: "Publicando…",
    published: "Publicado.",
    photo: "Foto",
    removePhoto: "Eliminar foto",
    optimizingPhoto: "Optimizando foto…",
    imageTypeUnsupported: "Elige una imagen JPEG, PNG o WebP.",
    imageSourceTooLarge: "La imagen seleccionada supera los 10 MiB.",
    imageOptimizationFailed: "No se pudo optimizar la foto.",
    imageServerRejected: "El servidor rechazó la foto optimizada.",
    hidePublication: "Ocultar",
    hidingPublication: "Ocultando…",
    restorePublication: "Restaurar",
    restoringPublication: "Restaurando…",
    hiddenTitle: "Mis publicaciones ocultas",
    hiddenSubtitle: "Publicaciones ocultas para el perfil ARCTor activo.",
    hiddenEmpty: "No hay publicaciones ocultas para este perfil.",
    signInRequired: "Inicia sesión para ver las publicaciones ocultas.",
  },
  cs: {
    newPublication: "Nová publikace",
    publicationPlaceholder: "Sdílejte veřejnou aktualizaci…",
    publish: "Publikovat",
    publishing: "Publikování…",
    published: "Publikováno.",
    photo: "Fotografie",
    removePhoto: "Odstranit fotografii",
    optimizingPhoto: "Optimalizace fotografie…",
    imageTypeUnsupported: "Vyberte obrázek JPEG, PNG nebo WebP.",
    imageSourceTooLarge: "Vybraný obrázek je větší než 10 MiB.",
    imageOptimizationFailed: "Fotografii se nepodařilo optimalizovat.",
    imageServerRejected: "Server optimalizovanou fotografii odmítl.",
    hidePublication: "Skrýt",
    hidingPublication: "Skrývání…",
    restorePublication: "Obnovit",
    restoringPublication: "Obnovování…",
    hiddenTitle: "Moje skryté publikace",
    hiddenSubtitle: "Publikace skryté pro aktuálně aktivní profil ARCTor.",
    hiddenEmpty: "Pro tento profil nejsou žádné skryté publikace.",
    signInRequired: "Přihlaste se, abyste viděli skryté publikace.",
  },
};

export function getFeedInteractionCopy(locale: LocaleCode) {
  return COPY[locale];
}
