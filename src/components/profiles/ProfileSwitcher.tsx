"use client";

import { useState } from "react";
import { UsersRound } from "lucide-react";

export type OwnedProfileSwitchOption = {
  id: string;
  publicSlug: string;
  displayName: string;
  profileKind: "personal" | "avatar";
};

type ProfileSwitcherProps = {
  currentProfileId: string;
  profiles: OwnedProfileSwitchOption[];
  locale: string;
  mode: "view" | "edit";
  label: string;
  personalLabel: string;
  avatarLabel: string;
};

export default function ProfileSwitcher({
  currentProfileId,
  profiles,
  locale,
  mode,
  label,
  personalLabel,
  avatarLabel,
}: ProfileSwitcherProps) {
  const [selectedId, setSelectedId] = useState(currentProfileId);

  function openProfile(profileId: string) {
    setSelectedId(profileId);
    const profile = profiles.find((candidate) => candidate.id === profileId);

    if (!profile) {
      return;
    }

    const pathname =
      mode === "edit"
        ? `/profiles/${encodeURIComponent(profile.id)}/edit`
        : `/people/${encodeURIComponent(profile.publicSlug)}`;
    const search = locale && locale !== "en"
      ? `?locale=${encodeURIComponent(locale)}`
      : "";

    window.location.assign(`${pathname}${search}`);
  }

  return (
    <label className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#dfe3f1] bg-white px-3 text-[12px] font-semibold text-[#4a4f6a] shadow-sm">
      <UsersRound size={14} className="text-[#6f42f5]" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        title={label}
        value={selectedId}
        onChange={(event) => openProfile(event.target.value)}
        className="max-w-[260px] cursor-pointer border-0 bg-transparent pr-1 text-[12px] font-semibold text-[#4a4f6a] outline-none"
      >
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.profileKind === "avatar" ? avatarLabel : personalLabel} — {profile.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}
