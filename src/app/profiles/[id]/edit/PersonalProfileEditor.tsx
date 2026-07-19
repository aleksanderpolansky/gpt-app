"use client";

import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ElementType,
  type ReactNode,
} from "react";
import {
  Camera,
  Eye,
  EyeOff,
  FolderKanban,
  Globe,
  MapPin,
  MessageCircle,
  Newspaper,
  Phone,
  Save,
  Star,
} from "lucide-react";

import ProfileSwitcher, {
  type OwnedProfileSwitchOption,
} from "@/components/profiles/ProfileSwitcher";
import { getPersonalProfileMessages } from "@/i18n/messages/personal-profile";

export type PersonalProfileEditorInitialData = {
  locale: string;
  profile: {
    id: string;
    actorId: string;
    profileKind: "personal" | "avatar";
    publicSlug: string;
    displayName: string;
    bio: string | null;
    imageUrl: string | null;
    categoryLabel: string | null;
    publicPhone: string | null;
    websiteUrl: string | null;
    messengerUrl: string | null;
    isPublic: boolean;
  };
  ownedProfiles: OwnedProfileSwitchOption[];
};

type EditValues = {
  displayName: string;
  bio: string;
  imageUrl: string;
  publicPhone: string;
  websiteUrl: string;
  messengerUrl: string;
};

function appendLocale(pathname: string, locale: string) {
  return locale === "en" ? pathname : `${pathname}?locale=${encodeURIComponent(locale)}`;
}
function initialValues(data: PersonalProfileEditorInitialData): EditValues {
  return {
    displayName: data.profile.displayName,
    bio: data.profile.bio ?? "",
    imageUrl: data.profile.imageUrl ?? "",
    publicPhone: data.profile.publicPhone ?? "",
    websiteUrl: data.profile.websiteUrl ?? "",
    messengerUrl: data.profile.messengerUrl ?? "",
  };
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1
    ? `${words[0][0] ?? ""}${words[1][0] ?? ""}`
    : name.trim().slice(0, 2) || "U").toUpperCase();
}

function TopCard({
  label,
  icon: Icon,
  accent,
  children,
  footerIconOnly = false,
}: {
  label: string;
  icon: ElementType;
  accent: string;
  children: ReactNode;
  footerIconOnly?: boolean;
}) {
  return (
    <div className="flex min-h-[390px] flex-col overflow-hidden rounded-2xl border border-[#edf0f7] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
      {footerIconOnly ? null : (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#7c8099]">{label}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}18`, color: accent }}>
            <Icon size={15} />
          </span>
        </div>
      )}
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
      {footerIconOnly ? (
        <div className="mt-auto flex justify-end pt-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}18`, color: accent }}>
            <Icon size={15} />
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Placeholder({ label, tall = false }: { label: string; tall?: boolean }) {
  return (
    <div className={`flex ${tall ? "min-h-[290px] flex-1" : "h-[140px]"} items-center justify-center rounded-xl bg-[#f8f9fd] text-[12px] text-[#9ca3b8]`}>
      {label}
    </div>
  );
}

function BigCard({ title, details, children }: { title: string; details: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#edf0f7] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-bold text-[#1a1d2e]">{title}</h3>
        <span className="text-[11px] text-[#3b6ef8]">{details}</span>
      </div>
      {children}
    </div>
  );
}

function FutureCard({ title, label }: { title: string; label: string }) {
  return (
    <div className="rounded-xl border border-[#edf0f7] bg-white p-4 shadow-sm">
      <div className="text-[13px] font-semibold text-[#1a1d2e]">{title}</div>
      <div className="mt-3 h-1.5 rounded-full bg-[#f0f2f7]" />
      <div className="mt-3 text-[11px] text-[#9ca3b8]">{label}</div>
    </div>
  );
}

export default function PersonalProfileEditor({
  initialData,
}: {
  initialData: PersonalProfileEditorInitialData;
}) {
  const messages = getPersonalProfileMessages(initialData.locale);
  const startingValues = useMemo(() => initialValues(initialData), [initialData]);
  const [savedValues, setSavedValues] = useState(startingValues);
  const [values, setValues] = useState(startingValues);
  const [isPublic, setIsPublic] = useState(initialData.profile.isPublic);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const hasChanges = JSON.stringify(values) !== JSON.stringify(savedValues);
  const profileTypeLabel = initialData.profile.profileKind === "avatar" ? messages.avatar : messages.personalProfile;

  function setField<Key extends keyof EditValues>(key: Key, value: EditValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
    setErrorMessage(null);
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setErrorMessage(messages.imageTooLarge);
      event.currentTarget.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setField("imageUrl", reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!values.displayName.trim()) {
      setErrorMessage(messages.nameRequired);
      return;
    }

    setSaveState("saving");
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/profiles/${initialData.profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? messages.saveError);
      setSavedValues(values);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      setErrorMessage(error instanceof Error ? error.message : messages.saveError);
    }
  }

  async function toggleVisibility() {
    setVisibilityBusy(true);
    setErrorMessage(null);
    const nextVisibility = !isPublic;

    try {
      const response = await fetch(`/api/profiles/${initialData.profile.id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: nextVisibility }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? messages.visibilityError);
      setIsPublic(nextVisibility);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : messages.visibilityError);
    } finally {
      setVisibilityBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef1f7]">
      <div className="mx-auto w-full max-w-[1640px] px-4 py-5 md:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={appendLocale(`/people/${initialData.profile.publicSlug}`, initialData.locale)}
              className="inline-flex min-h-9 items-center rounded-full border border-[#dfe3f1] bg-white px-4 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
            >
              {messages.viewMode}
            </Link>
            <button
              type="button"
              onClick={toggleVisibility}
              disabled={visibilityBusy}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-4 text-[12px] font-semibold shadow-sm transition disabled:opacity-50 ${isPublic ? "border-[#fecaca] bg-[#fff1f2] text-[#dc2626]" : "border-[#bbf7d0] bg-[#f0fdf4] text-[#16a34a]"}`}
            >
              {isPublic ? <EyeOff size={14} /> : <Eye size={14} />}
              {visibilityBusy ? messages.changingVisibility : isPublic ? messages.disableProfile : messages.enableProfile}
            </button>
            <ProfileSwitcher
              currentProfileId={initialData.profile.id}
              profiles={initialData.ownedProfiles}
              locale={initialData.locale}
              mode="edit"
              label={messages.switchProfile}
              personalLabel={messages.personalProfile}
              avatarLabel={messages.avatar}
            />
          </div>

          <div className="flex items-center gap-3">
            {hasChanges ? <span className="rounded-full border border-[#fecdd3] bg-[#fff1f2] px-3 py-1 text-[12px] font-semibold text-[#e11d48]">{messages.unsavedChanges}</span> : null}
            {saveState === "saved" ? <span className="text-[12px] font-semibold text-[#16a34a]">{messages.saved}</span> : null}
            <button
              type="button"
              onClick={save}
              disabled={!hasChanges || saveState === "saving"}
              className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 text-[13px] font-bold text-[#16a34a] shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={14} />
              {saveState === "saving" ? messages.saving : messages.saveChanges}
            </button>
          </div>
        </div>

        {errorMessage ? <div className="mb-4 rounded-2xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-[13px] font-semibold text-[#b42318]">{errorMessage}</div> : null}

        <section className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8b91aa]">{messages.editor}</div>
          <input
            value={values.displayName}
            onChange={(event) => setField("displayName", event.target.value)}
            className="mt-2 w-full max-w-[720px] rounded-xl border border-dashed border-[#d9deed] bg-white/60 px-3 py-2 text-[24px] font-bold leading-tight text-[#111827] outline-none focus:border-[#3b6ef8]"
          />
          <div className="mt-1 text-[14px] text-[#7c8099]">{profileTypeLabel}</div>
          <p className="mt-2 max-w-[720px] text-[13px] text-[#7c8099]">{messages.editHint}</p>
        </section>

        <section className="grid auto-rows-auto items-stretch gap-4 lg:grid-cols-4">
          <TopCard label={messages.profileImage} icon={Star} accent="#3b6ef8" footerIconOnly>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              aria-label={messages.chooseImage}
              className="group relative mx-auto flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-2xl border border-[#dfe4ff] bg-[#eef2ff] text-[46px] font-bold text-[#3b6ef8]"
            >
              {values.imageUrl ? <img src={values.imageUrl} alt="" className="h-full w-full object-cover" /> : initials(values.displayName)}
              <span className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#3b6ef8] shadow-lg"><Camera size={18} /></span>
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            <div className="mt-3 text-[13px] font-semibold text-[#1a1d2e]">{values.displayName}</div>
            <div className="mt-1 min-h-4 text-[11px] text-[#9ca3b8]">{initialData.profile.categoryLabel ?? ""}</div>
          </TopCard>
          <TopCard label={messages.address} icon={MapPin} accent="#f97316"><Placeholder label={messages.comingSoon} tall /></TopCard>
          <TopCard label={messages.projects} icon={FolderKanban} accent="#22c55e"><Placeholder label={messages.comingSoon} tall /></TopCard>
          <TopCard label={messages.articles} icon={Newspaper} accent="#8b5cf6"><Placeholder label={messages.comingSoon} tall /></TopCard>
        </section>

        <section className="mt-4 grid gap-2 md:grid-cols-3">
          {([
            ["publicPhone", messages.phone, Phone],
            ["websiteUrl", messages.website, Globe],
            ["messengerUrl", messages.messenger, MessageCircle],
          ] as const).map(([key, label, Icon]) => (
            <label key={key} className="flex min-h-10 items-center gap-2 rounded-xl border border-[#dfe3f1] bg-white px-3 text-[#7c8099] shadow-sm">
              <Icon size={14} />
              <span className="sr-only">{label}</span>
              <input value={values[key]} onChange={(event) => setField(key, event.target.value)} placeholder={label} className="min-w-0 flex-1 border-0 bg-transparent text-[12px] text-[#4a4f6a] outline-none" />
            </label>
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <BigCard title={messages.description} details={messages.details}>
            <textarea
              value={values.bio}
              onChange={(event) => setField("bio", event.target.value)}
              placeholder={messages.description}
              rows={6}
              className="min-h-[140px] w-full resize-y rounded-xl border border-dashed border-[#d9deed] bg-[#fbfcff] p-3 text-[13px] leading-6 text-[#5a5f7a] outline-none focus:border-[#3b6ef8]"
            />
          </BigCard>
          <BigCard title={messages.articles} details={messages.details}><Placeholder label={messages.comingSoon} /></BigCard>
          <BigCard title={messages.activity} details={messages.details}><Placeholder label={messages.comingSoon} /></BigCard>
          <BigCard title={messages.projects} details={messages.details}><Placeholder label={messages.comingSoon} /></BigCard>
        </section>

        <section className="mt-5">
          <h2 className="mb-3 text-[13px] font-semibold text-[#1a1d2e]">{messages.publicProfile}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FutureCard title={messages.articles} label={messages.comingSoon} />
            <FutureCard title={messages.activity} label={messages.comingSoon} />
            <FutureCard title={messages.projects} label={messages.comingSoon} />
            <FutureCard title={messages.categories} label={messages.comingSoon} />
          </div>
        </section>
      </div>
    </main>
  );
}
