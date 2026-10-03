import { notFound } from "next/navigation";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { PersonalLeafCreateForm } from "./personal-leaf-create-form";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type PageProps = {
  searchParams?: Promise<{ locale?: string | string[] }>;
};

function normalizeLocale(value: string | string[] | undefined): LocaleCode {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    candidate === "pl" ||
    candidate === "ru" ||
    candidate === "uk" ||
    candidate === "de" ||
    candidate === "es" ||
    candidate === "cs"
  ) {
    return candidate;
  }

  return "en";
}

export default async function NewPersonalLeafPage({
  searchParams,
}: PageProps) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    notFound();
  }

  let actorContext: Awaited<ReturnType<typeof resolveActiveActorContext>>;

  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      notFound();
    }

    throw error;
  }

  const query = searchParams ? await searchParams : undefined;
  const locale = normalizeLocale(query?.locale);

  return (
    <PersonalLeafCreateForm
      locale={locale}
      activeProfileName={actorContext.profile.displayName}
    />
  );
}
