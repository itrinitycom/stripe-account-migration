import Stripe from "stripe";

export function sanitizeSubscription(
  oldSubscription: Stripe.Subscription,
  prices: Map<string, string>,
  automaticTax: boolean
): Stripe.SubscriptionCreateParams {
  // update price ids
  const items: {
    price: string;
    quantity: number | undefined;
  }[] = [];
  oldSubscription.items.data.forEach((item) => {
    const priceId = prices.get(item.price.id);

    if (!priceId) throw Error("price_id does not exist");
    items.push({
      price: priceId,
      quantity: item.quantity,
    });
  });

  if (typeof oldSubscription.customer !== "string") {
    throw Error("customer is not of type string");
  }

  return {
    customer: oldSubscription.customer,
    backdate_start_date: oldSubscription.current_period_start,
    billing_cycle_anchor: oldSubscription.current_period_end,
    items,
    currency: oldSubscription.currency,
    description: oldSubscription.description
      ? oldSubscription.description
      : undefined,
    metadata: { ...oldSubscription.metadata },
    automatic_tax: { enabled: automaticTax },
    cancel_at: oldSubscription.cancel_at
      ? oldSubscription.cancel_at
      : undefined,
    collection_method: oldSubscription.collection_method,
    days_until_due: oldSubscription.days_until_due
      ? oldSubscription.days_until_due
      : undefined,
    payment_settings: {
      save_default_payment_method: "on_subscription",
    },
    pending_invoice_item_interval:
      oldSubscription.pending_invoice_item_interval,
    proration_behavior: "none",
  };
}
