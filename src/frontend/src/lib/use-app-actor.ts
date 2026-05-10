import { createActorWithConfig } from "@caffeineai/core-infrastructure";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { mockBackend } from "@/mocks/backend";
import { createRuntimeBackend } from "./runtime-backend";

const ACTOR_QUERY_KEY = "app-actor";

function hasAccessControl(actor: unknown): actor is {
  _initializeAccessControl: () => Promise<void>;
} {
  return (
    typeof actor === "object" &&
    actor !== null &&
    "_initializeAccessControl" in actor
  );
}

export function useAppActor<TActor>(
  createActor: (...args: any[]) => TActor,
): { actor: TActor | null; isFetching: boolean } {
  const { identity, isAuthenticated } = useInternetIdentity();
  const queryClient = useQueryClient();

  const actorQuery = useQuery({
    queryKey: [ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (import.meta.env.VITE_RUNTIME_BACKEND_URL) {
        return createRuntimeBackend(
          import.meta.env.VITE_RUNTIME_BACKEND_URL,
        ) as unknown as TActor;
      }

      if (import.meta.env.VITE_USE_MOCK === "true") {
        return mockBackend as unknown as TActor;
      }

      if (import.meta.env.VITE_USE_LOCAL_RUNTIME === "true") {
        return createRuntimeBackend() as unknown as TActor;
      }

      if (!isAuthenticated) {
        return (await createActorWithConfig(createActor)) as TActor;
      }

      const actor = (await createActorWithConfig(createActor, {
        agentOptions: { identity },
      })) as TActor;

      if (hasAccessControl(actor)) {
        await actor._initializeAccessControl();
      }

      return actor;
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
  });

  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
      queryClient.refetchQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data ?? null,
    isFetching: actorQuery.isFetching,
  };
}
