const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;
  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-200">
      Test mode — use card 4242 4242 4242 4242. No real charges.
    </div>
  );
}