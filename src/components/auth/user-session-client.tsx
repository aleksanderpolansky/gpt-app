"use client";

import { useEffect, useMemo, useState } from "react";
import { Settings } from "lucide-react";

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

type MeApiResponse = {
  user?: UserProfile | null;
  error?: string;
};

type SyncUserApiResponse = {
  person?: SyncedPerson | null;
  actor?: SyncedActor | null;
  error?: string;
};

export type UserSessionSnapshot = {
  user: UserProfile | null;
  person: SyncedPerson | null;
  actor: SyncedActor | null;
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
    "Пользователь"
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
        error: "Не удалось прочитать ответ /api/me.",
        syncStatus: "Сессия не определена.",
        displayName: "Гость",
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
        error: meData.error || "Ошибка проверки пользователя.",
        syncStatus: "Пользователь не вошёл.",
        displayName: "Гость",
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
        syncStatus: "Пользователь не вошёл.",
        displayName: "Гость",
        email: null,
        initials: "G",
      };
    }

    let person: SyncedPerson | null = null;
    let actor: SyncedActor | null = null;
    let syncStatus = "Пользователь вошёл. Синхронизация person/actor не выполнялась.";

    try {
      const syncResponse = await fetch("/api/sync-user", {
        method: "POST",
      });

      const syncData = (await syncResponse.json()) as SyncUserApiResponse;

      if (syncResponse.ok) {
        person = syncData.person || null;
        actor = syncData.actor || null;
        syncStatus = "Пользователь, person и actor синхронизированы.";
      } else {
        syncStatus = syncData.error || "Ошибка синхронизации пользователя.";
      }
    } catch {
      syncStatus = "Не удалось выполнить /api/sync-user.";
    }

    const email = user.email || null;
    const displayName = buildDisplayName(user, person, actor);

    return {
      user,
      person,
      actor,
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
      error: "Не удалось проверить сессию пользователя.",
      syncStatus: "Сессия не определена.",
      displayName: "Гость",
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

export function useUserSessionClient(): UserSessionSnapshot {
  const [snapshot, setSnapshot] = useState<UserSessionSnapshot>({
    user: null,
    person: null,
    actor: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    syncStatus: "Проверяю вход пользователя...",
    displayName: "Пользователь",
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

  const subtitle = useMemo(() => {
    if (session.isLoading) {
      return "Проверка входа...";
    }

    if (!session.isAuthenticated) {
      return "Гость";
    }

    return session.email || session.syncStatus;
  }, [
    session.email,
    session.isAuthenticated,
    session.isLoading,
    session.syncStatus,
  ]);

  if (session.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-[#f5f6fb] px-3 py-2 text-[12px] font-semibold text-[#7c8099]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#9ca3b8]" />
        Проверяю вход...
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
          Войти
        </a>

        <div className="hidden items-center gap-2 rounded-lg bg-[#f5f6fb] px-3 py-2 text-[12px] font-semibold text-[#7c8099] md:flex">
          <span className="h-2 w-2 rounded-full bg-[#9ca3b8]" />
          Гость
        </div>
      </>
    );
  }

  return (
    <>
      <div className="hidden items-center gap-2 rounded-lg border border-[#bbf7d0] bg-[#f0fff4] px-3 py-2 text-[12px] font-semibold text-[#15803d] md:flex">
        <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
        Вы вошли
      </div>

      <a
        href="/auth/profile"
        className="flex items-center gap-2 rounded-lg py-1.5 pl-2 pr-2 transition-colors hover:bg-gray-50"
        title={session.syncStatus}
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

      <a
        href="/privacy-audit"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.08)] bg-white text-[#5a5f7a] transition-colors hover:bg-[#f5f6fb] hover:text-[#3b6ef8]"
        title="Настройки"
      >
        <Settings size={15} />
      </a>

      <a
        href="/auth/logout"
        className="hidden rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-[12px] font-semibold text-[#5a5f7a] transition-colors hover:bg-[#f5f6fb] md:inline-flex"
      >
        Выйти
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

  if (session.isLoading) {
    return (
      <div className={`text-[10.5px] leading-none text-[#9ca3b8] ${className}`}>
        Проверяю вход...
      </div>
    );
  }

  if (!session.isAuthenticated) {
    return (
      <div className={`text-[10.5px] leading-none text-[#ef4444] ${className}`}>
        Не выполнен вход
      </div>
    );
  }

  return (
    <div className={`text-[10.5px] leading-none text-[#22a652] ${className}`}>
      Вы вошли как: {session.displayName}
    </div>
  );
}
