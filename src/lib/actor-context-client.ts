export type ActorContextClientOption = {
  profileId: string;
  profileKind: "personal" | "avatar";
  displayName: string;
  imageUrl: string | null;
};

export type ActorContextClientResponse = {
  ok?: boolean;
  activeProfile?: ActorContextClientOption | null;
  profiles?: ActorContextClientOption[];
  error?: string;
  errorMessage?: string;
};

let actorContextRequest: Promise<ActorContextClientResponse> | null = null;

export function loadActorContextClient(): Promise<ActorContextClientResponse> {
  if (!actorContextRequest) {
    actorContextRequest = fetch("/api/actor-context", {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json()) as ActorContextClientResponse;

        if (!response.ok || !data.ok) {
          throw new Error(
            data.errorMessage || data.error || "Could not load actor context.",
          );
        }

        return data;
      })
      .catch((error: unknown) => {
        actorContextRequest = null;
        throw error;
      });
  }

  return actorContextRequest;
}

export function resetActorContextClientCache() {
  actorContextRequest = null;
}
