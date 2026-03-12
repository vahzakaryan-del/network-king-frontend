export async function startStripeCheckout(
  purchaseId: number,
  token: string
) {
  const API = process.env.NEXT_PUBLIC_API_URL;
  if (!API) throw new Error("NEXT_PUBLIC_API_URL is not defined");

  let checkoutData: { checkoutUrl: string; error?: string };

  try {
    const res = await fetch(`${API}/stripe/create-checkout/${purchaseId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    checkoutData = await res.json();

    if (!res.ok || !checkoutData.checkoutUrl) {
      throw new Error(checkoutData?.error || "Failed to start Stripe checkout");
    }
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    throw new Error(err?.message || "Unknown error starting Stripe checkout");
  }

  // Redirect the user to Stripe checkout
  window.location.href = checkoutData.checkoutUrl;

  // Optional: return the URL in case you want to test or log it
  return checkoutData.checkoutUrl;
}