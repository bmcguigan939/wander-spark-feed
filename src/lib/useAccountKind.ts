import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { getBookableStatus, type AccountKind } from "@/lib/bookable.functions";

/**
 * Single shared hook so every business-side surface renders the same
 * activity-vs-stay copy. Reuses the same query key as OnboardingChecklist
 * so they dedupe automatically.
 */
export function useAccountKind(): AccountKind {
  const { user } = useAuth();
  const fn = useServerFn(getBookableStatus);
  const { data } = useQuery({
    queryKey: ["bookable-status", user?.id],
    queryFn: () => fn({ data: { businessId: user!.id } }),
    enabled: !!user?.id,
  });
  return data?.accountKind ?? "unknown";
}