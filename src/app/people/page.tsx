import { UsersRound } from "lucide-react";

import { normalizeLocale } from "@/i18n";
import { getPersonalProfileMessages } from "@/i18n/messages/personal-profile";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readLocale(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams.locale ?? searchParams.lang;
  return normalizeLocale(Array.isArray(value) ? value[0] : value);
}
export default async function PeopleAndAvatarsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const locale = readLocale(resolvedSearchParams);
  const messages = getPersonalProfileMessages(locale);

  return (
    <main className="min-h-full bg-[#f5f6fb] p-5 text-[#1a1d2e]">
      <section className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-6 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef2ff] text-[#3b6ef8]">
          <UsersRound size={21} />
        </div>
        <h1 className="mt-4 text-[20px] font-bold">{messages.peopleTitle}</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#7c8099]">
          {messages.peopleIntro}
        </p>
        <div className="mt-5 flex h-[140px] items-center justify-center rounded-xl bg-[#f8f9fd] text-[12px] text-[#9ca3b8]">
          {messages.comingSoon}
        </div>
      </section>
    </main>
  );
}
