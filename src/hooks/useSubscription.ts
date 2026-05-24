import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getStripeEnvironment } from "@/lib/stripe";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  product_id: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  environment: string;
  is_founding_member: boolean | null;
  founding_member_number: number | null;
}

const PLAN_BY_PRICE: Record<string, "creator_pro" | "business_plus"> = {
  creator_pro_monthly: "creator_pro",
  creator_pro_yearly: "creator_pro",
  business_plus_monthly: "business_plus",
  business_plus_yearly: "business_plus",
};

export function useSubscription() {
  const { user } = useAuth();
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setSub(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("environment", getStripeEnvironment())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSub((data as SubscriptionRow | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refetch();
    if (!user) return;
    const channel = supabase
      .channel(`subscriptions:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => { void refetch(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, refetch]);

  const now = Date.now();
  const endMs = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const isActive = !!sub && (
    (["active", "trialing", "past_due"].includes(sub.status) && (!endMs || endMs > now)) ||
    (sub.status === "canceled" && endMs !== null && endMs > now)
  );

  const plan = sub ? PLAN_BY_PRICE[sub.price_id] ?? null : null;

  return { sub, loading, isActive, plan, refetch };
}