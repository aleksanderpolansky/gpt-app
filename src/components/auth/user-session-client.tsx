"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, LogOut, Plus } from "lucide-react";

import {
  getLocaleSearchParam,
  getNavigationMessage,
  type LocaleCode,
  type NavigationMessageKey,
} from "@/i18n";

type UserProfile = {
  name?: string;
  email?: string;
  picture?: string;
  nickname?: string;
  sub?: string;
};

type SyncedPerson = {
  id: string;
  full_name?: string;
  short_name?: string;
};

type SyncedActor = {
  id: string;
  actor_type: string;
  display_name: string;
};

type SyncedPublicProfile = {
  id: string;
  public_slug: string;
  display_name: string;
  profile_kind: "personal" | "avatar";
  is_public: boolean;
};

type MeApiResponse = {
  user?: UserProfile | null;
  error?: string;
};

type SyncUserApiResponse = {
  person?: SyncedPerson | null;
  actor?: SyncedActor | null;
  publicProfile?: SyncedPublicProfile | null;
  error?: string;
};

type ActorContextOption = {
  profileId: string;
  profileKind: "personal" | "avatar";
  displayName: string;
  imageUrl: string | null;
};

type ActorContextApiResponse = {
  ok?: boolean;
  activeProfile?: ActorContextOption | null;
  profiles?: ActorContextOption[];
  error?: string;
  errorMessage?: string;
};

type ActorContextLabels = {
  actingAs: string;
  createAvatar: string;
  loading: string;
  personal: string;
  avatar: string;
  unavailable: string;
};

export type UserSessionSnapshot = {
  user: UserProfile | null;
  person: SyncedPerson | null;
  actor: SyncedActor | null;
  publicProfile?: SyncedPublicProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  syncStatus: string;
  displayName: string;
  email: string | null;
  initials: string;
};

let cachedSessionPromise: Promise<Omit<UserSessionSnapshot, "isLoading">> | null =
  null;

function buildDisplayName(
  user: UserProfile | null,
  person: SyncedPerson | null,
  actor: SyncedActor | null,
) {
  return (
    user?.name ||
    user?.nickname ||
    actor?.display_name ||
    person?.short_name ||
    person?.full_name ||
    user?.email ||
    "User"
  );
}

function buildInitials(displayName: string, email: string | null) {
  const source = displayName || email || "U";
  const words = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] || "U"}${words[1][0] || ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function getActorContextLabels(locale: LocaleCode): ActorContextLabels {
  switch (locale) {
    case "ru":
      return {
        actingAs: "Действовать как",
        createAvatar: "Создать аватар",
        loading: "Загрузка профилей…",
        personal: "Личный профиль",
        avatar: "Аватар",
        unavailable: "Профили недоступны",
      };
    case "uk":
      return {
        actingAs: "Діяти як",
        createAvatar: "Створити аватар",
        loading: "Завантаження профілів…",
        personal: "Особистий профіль",
        avatar: "Аватар",
        unavailable: "Профілі недоступні",
      };
    case "pl":
      return {
        actingAs: "Działaj jako",
        createAvatar: "Utwórz awatar",
        loading: "Ładowanie profili…",
        personal: "Profil osobisty",
        avatar: "Awatar",
        unavailable: "Profile niedostępne",
      };
    case "de":
      return {
        actingAs: "Handeln als",
        createAvatar: "Avatar erstellen",
        loading: "Profile werden geladen…",
        personal: "Persönliches Profil",
        avatar: "Avatar",
        unavailable: "Profile nicht verfügbar",
      };
    case "es":
      return {
        actingAs: "Actuar como",
        createAvatar: "Crear avatar",
        loading: "Cargando perfiles…",
        personal: "Perfil personal",
        avatar: "Avatar",
        unavailable: "Perfiles no disponibles",
      };
    case "cs":
      return {
        actingAs: "Jednat jako",
        createAvatar: "Vytvořit avatara",
        loading: "Načítání profilů…",
        personal: "Osobní profil",
        avatar: "Avatar",
        unavailable: "Profily nejsou dostupné",
      };
    case "en":
    default:
      return {
        actingAs: "Acting as",
        createAvatar: "Create avatar",
        loading: "Loading profiles…",
        personal: "Personal profile",
        avatar: "Avatar",
        unavailable: "Profiles unavailable",
      };
  }
}

function ActorContextSwitcher({
  enabled,
  locale,
}: {
  readonly enabled: boolean;
  readonly locale: LocaleCode;
}) {
  const labels = getActorContextLabels(locale);
  const [profiles, setProfiles] = useState<ActorContextOption[]>([]);
  const [activeProfile, setActiveProfile] =
    useState<ActorContextOption | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) {
      setProfiles([]);
      setActiveProfile(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    fetch("/api/actor-context", {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json()) as ActorContextApiResponse;

        if (!response.ok || !data.ok) {
          throw new Error(
            data.errorMessage || data.error || "Could not load actor context.",
          );
        }

        return data;
      })
      .then((data) => {
        if (!mounted) {
          return;
        }

        setProfiles(data.profiles ?? []);
        setActiveProfile(data.activeProfile ?? null);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!mounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load actor context.",
        );
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  async function changeActiveProfile(profileId: string) {
    if (
      isUpdating ||
      !profileId ||
      profileId === activeProfile?.profileId
    ) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch("/api/actor-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileId }),
      });
      const data = (await response.json()) as ActorContextApiResponse;

      if (!response.ok || !data.ok || !data.activeProfile) {
        throw new Error(
          data.errorMessage || data.error || "Could not change actor context.",
        );
      }

      setActiveProfile(data.activeProfile);
      setProfiles(data.profiles ?? profiles);
      window.location.reload();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not change actor context.",
      );
      setIsUpdating(false);
    }
  }

  if (!enabled) {
    return null;
  }

  const title = error || labels.actingAs;
  const activeInitials = activeProfile
    ? buildInitials(activeProfile.displayName, null)
    : isLoading
      ? "…"
      : "!";
  const createAvatarHref = buildLocaleAwareHref("/profiles/new", locale);

  return (
    <div ref={switcherRef} className="relative flex items-center">
      <button
        type="button"
        title={title}
        aria-label={labels.actingAs}
        aria-haspopup="listbox"
        aria-expanded={isMenuOpen}
        disabled={isLoading || isUpdating || !activeProfile}
        onClick={() => setIsMenuOpen((current) => !current)}
        className={`flex h-9 w-11 items-center justify-center gap-1 rounded-lg border bg-white px-1 shadow-sm transition-colors hover:bg-[#f5f6fb] disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-[61px] sm:gap-1.5 sm:px-2 ${
          error ? "border-red-200" : "border-[#dfe3f1]"
        }`}
      >
        <span
          className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
            error
              ? "bg-red-500"
              : "bg-gradient-to-br from-[#3b6ef8] to-[#6f42f5]"
          }`}
        >
          {activeInitials}
        </span>
        <ChevronDown
          size={14}
          className={`text-[#7c8099] transition-transform ${
            isMenuOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isMenuOpen && profiles.length > 0 && activeProfile ? (
        <div
          role="listbox"
          aria-label={labels.actingAs}
          className="absolute right-0 top-[calc(100%+6px)] z-[80] w-[270px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-[#dfe3f1] bg-white p-1.5 shadow-[0_14px_36px_rgba(35,42,75,0.18)]"
        >
          <div className="px-2.5 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#9ca3b8]">
            {labels.actingAs}
          </div>

          {profiles.map((profile) => {
            const isActive = profile.profileId === activeProfile.profileId;

            return (
              <button
                key={profile.profileId}
                type="button"
                role="option"
                aria-selected={isActive}
                disabled={isUpdating}
                onClick={() => {
                  setIsMenuOpen(false);
                  void changeActiveProfile(profile.profileId);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors disabled:cursor-wait disabled:opacity-60 ${
                  isActive ? "bg-[#eef2ff]" : "hover:bg-[#f5f6fb]"
                }`}
              >
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#3b6ef8] to-[#6f42f5] px-1 text-[10px] font-bold text-white">
                  {buildInitials(profile.displayName, null)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold text-[#30354d]">
                    {profile.displayName}
                  </span>
                  <span className="block text-[9px] text-[#9ca3b8]">
                    {profile.profileKind === "avatar"
                      ? labels.avatar
                      : labels.personal}
                  </span>
                </span>

                {isActive ? (
                  <Check size={15} className="text-[#6f42f5]" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}

          <div className="my-1 border-t border-[#eceef5]" />
          <a
            href={createAvatarHref}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[#6f42f5] transition-colors hover:bg-[#f5f6fb]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d9d0ff] bg-[#f5f1ff]">
              <Plus size={15} aria-hidden="true" />
            </span>
            <span className="text-[11px] font-semibold">
              {labels.createAvatar}
            </span>
          </a>
        </div>
      ) : null}

      {error ? <span className="sr-only">{labels.unavailable}</span> : null}
    </div>
  );
}

async function loadUserSessionSnapshot(): Promise<
  Omit<UserSessionSnapshot, "isLoading">
> {
  try {
    const meResponse = await fetch("/api/me", {
      method: "GET",
      cache: "no-store",
    });

    let meData: MeApiResponse = {};

    try {
      meData = (await meResponse.json()) as MeApiResponse;
    } catch {
      return {
        user: null,
        person: null,
        actor: null,
        isAuthenticated: false,
        error: "Could not read /api/me response.",
        syncStatus: "Session is not defined.",
        displayName: "Guest",
        email: null,
        initials: "G",
      };
    }

    if (!meResponse.ok) {
      return {
        user: null,
        person: null,
        actor: null,
        isAuthenticated: false,
        error: meData.error || "User check error.",
        syncStatus: "User is not signed in.",
        displayName: "Guest",
        email: null,
        initials: "G",
      };
    }

    const user = meData.user || null;

    if (!user) {
      return {
        user: null,
        person: null,
        actor: null,
        isAuthenticated: false,
        error: null,
        syncStatus: "User is not signed in.",
        displayName: "Guest",
        email: null,
        initials: "G",
      };
    }

    let person: SyncedPerson | null = null;
    let actor: SyncedActor | null = null;
    let publicProfile: SyncedPublicProfile | null = null;
    let syncStatus = "User signed in. person/actor sync was not executed.";

    try {
      const syncResponse = await fetch("/api/sync-user", {
        method: "POST",
      });

      const syncData = (await syncResponse.json()) as SyncUserApiResponse;

      if (syncResponse.ok) {
        person = syncData.person || null;
        actor = syncData.actor || null;
        publicProfile = syncData.publicProfile || null;
        syncStatus = "User, person and actor are synchronized.";
      } else {
        syncStatus = syncData.error || "User synchronization error.";
      }
    } catch {
      syncStatus = "Could not run /api/sync-user.";
    }

    const email = user.email || null;
    const displayName = buildDisplayName(user, person, actor);

    return {
      user,
      person,
      actor,
      publicProfile,
      isAuthenticated: true,
      error: null,
      syncStatus,
      displayName,
      email,
      initials: buildInitials(displayName, email),
    };
  } catch {
    return {
      user: null,
      person: null,
      actor: null,
      isAuthenticated: false,
      error: "Could not check user session.",
      syncStatus: "Session is not defined.",
      displayName: "Guest",
      email: null,
      initials: "G",
    };
  }
}

function getCachedSessionPromise() {
  if (!cachedSessionPromise) {
    cachedSessionPromise = loadUserSessionSnapshot();
  }

  return cachedSessionPromise;
}

function useInterfaceLocale(): LocaleCode {
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    function readLocaleFromUrl() {
      if (typeof window === "undefined") {
        return;
      }

      setLocale(getLocaleSearchParam(new URLSearchParams(window.location.search)));
    }

    readLocaleFromUrl();
    window.addEventListener("popstate", readLocaleFromUrl);

    return () => {
      window.removeEventListener("popstate", readLocaleFromUrl);
    };
  }, []);

  return locale;
}

function buildLocaleAwareHref(pathname: string, locale: LocaleCode) {
  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function useNavigationLabel(key: NavigationMessageKey) {
  const locale = useInterfaceLocale();

  return getNavigationMessage(key, locale);
}

export function useUserSessionClient(): UserSessionSnapshot {
  const [snapshot, setSnapshot] = useState<UserSessionSnapshot>({
    user: null,
    person: null,
    actor: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    syncStatus: "Checking user sign-in...",
    displayName: "User",
    email: null,
    initials: "U",
  });

  useEffect(() => {
    let mounted = true;

    getCachedSessionPromise().then((loadedSnapshot) => {
      if (!mounted) {
        return;
      }

      setSnapshot({
        ...loadedSnapshot,
        isLoading: false,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  return snapshot;
}

export function UserSessionTopBarControls() {
  const session = useUserSessionClient();
  const locale = useInterfaceLocale();
  const checkingSignInLabel = useNavigationLabel("navigation.checkingSignIn");
  const guestLabel = useNavigationLabel("navigation.guest");
  const loggedInLabel = useNavigationLabel("navigation.loggedIn");
  const signInLabel = useNavigationLabel("navigation.signIn");
  const signOutLabel = useNavigationLabel("navigation.signOut");

  const subtitle = useMemo(() => {
    if (session.isLoading) {
      return checkingSignInLabel;
    }

    if (!session.isAuthenticated) {
      return guestLabel;
    }

    return session.email || loggedInLabel;
  }, [
    checkingSignInLabel,
    guestLabel,
    loggedInLabel,
    session.email,
    session.isAuthenticated,
    session.isLoading,
  ]);

  const profileHref = session.publicProfile?.public_slug
    ? buildLocaleAwareHref(
        `/people/${encodeURIComponent(session.publicProfile.public_slug)}`,
        locale,
      )
    : null;

  if (session.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-[#f5f6fb] px-3 py-2 text-[12px] font-semibold text-[#7c8099]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#9ca3b8]" />
        {checkingSignInLabel}
      </div>
    );
  }

  if (!session.isAuthenticated) {
    return (
      <>
        <a
          href="/auth/login?connection=google-oauth2&prompt=select_account"
          className="rounded-lg bg-[#3b6ef8] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#2c5df0]"
        >
          {signInLabel}
        </a>

        <div className="hidden items-center gap-2 rounded-lg bg-[#f5f6fb] px-3 py-2 text-[12px] font-semibold text-[#7c8099] md:flex">
          <span className="h-2 w-2 rounded-full bg-[#9ca3b8]" />
          {guestLabel}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="hidden items-center gap-2 rounded-lg border border-[#bbf7d0] bg-[#f0fff4] px-3 py-2 text-[12px] font-semibold text-[#15803d] md:flex">
        <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
        {loggedInLabel}
      </div>

      <a
        href={profileHref ?? undefined}
        aria-disabled={!profileHref}
        className="hidden items-center gap-2 rounded-lg py-1.5 pl-2 pr-1 transition-colors hover:bg-[#f5f6fb] sm:flex"
        title={session.publicProfile?.display_name ?? loggedInLabel}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#3b6ef8] to-[#6f42f5] text-[11px] font-bold text-white">
          {session.initials}
        </div>

        <div className="hidden max-w-[190px] text-left sm:block">
          <div className="truncate text-[12px] font-semibold leading-none text-[#1a1d2e]">
            {session.displayName}
          </div>
          <div className="mt-0.5 truncate text-[10px] leading-none text-[#9ca3b8]">
            {subtitle}
          </div>
        </div>
      </a>

      <ActorContextSwitcher enabled locale={locale} />

      <a
        href="/auth/logout"
        aria-label={signOutLabel}
        title={signOutLabel}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.08)] bg-white text-[#5a5f7a] transition-colors hover:bg-[#f5f6fb] hover:text-[#3b6ef8] md:w-auto md:px-3 md:py-2 md:text-[12px] md:font-semibold"
      >
        <LogOut size={15} />
        <span className="hidden md:ml-1.5 md:inline">{signOutLabel}</span>
      </a>
    </>
  );
}

export function UserSessionMiniStatus({
  className = "",
}: {
  readonly className?: string;
}) {
  const session = useUserSessionClient();
  const checkingSignInLabel = useNavigationLabel("navigation.checkingSignIn");
  const notSignedInLabel = useNavigationLabel("navigation.notSignedIn");
  const loggedInLabel = useNavigationLabel("navigation.loggedIn");

  if (session.isLoading) {
    return (
      <div className={`text-[10.5px] leading-none text-[#9ca3b8] ${className}`}>
        {checkingSignInLabel}
      </div>
    );
  }

  if (!session.isAuthenticated) {
    return (
      <div className={`text-[10.5px] leading-none text-[#ef4444] ${className}`}>
        {notSignedInLabel}
      </div>
    );
  }

  return (
    <div className={`text-[10.5px] leading-none text-[#22a652] ${className}`}>
      {loggedInLabel}: {session.displayName}
    </div>
  );
}
