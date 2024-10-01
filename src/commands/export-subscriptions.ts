import { csvStringToMap, subscriptionsToCsvString } from "../core/csv";
import { promises as fs } from "fs";
import { createStripeClient } from "../core/stripe";

export interface SubscriptionExportItem {
  customer: string;
  start_date: number; // Unix timestamp
  items: Array<{ price: string; quantity: number }>;
  metadata: Record<string, string>;
  automatic_tax: "TRUE" | "FALSE";
  billing_cycle_anchor: number; // Unix timestamp
  coupon: string | undefined;
  trial_end: number | null; // Unix timestamp
  proration_behavior: "create_prorations" | "none";
  collection_method: "charge_automatically" | "send_invoice";
  default_tax_rate: string | undefined;
  backdate_start_date: number; // Unix timestamp
  days_until_due: number | null;
  cancel_at_period_end: "TRUE" | "FALSE";
}

export async function exportSubscriptions(
  pricesFilePath: string,
  taxesFilePath: string,
  subscriptionsFilePath: string,
  apiKeyOldAccount: string
) {
  const prices = await csvStringToMap(
    await fs.readFile(pricesFilePath, "utf8")
  );

  const taxes = await csvStringToMap(await fs.readFile(taxesFilePath, "utf8"));

  const subscriptionsToExport: SubscriptionExportItem[] = [];

  const subscriptions = await createStripeClient(
    apiKeyOldAccount
  ).subscriptions.list({ limit: 10 });

  subscriptions.data.forEach(async (oldSubscription) => {
    if (
      oldSubscription.status !== "canceled" &&
      oldSubscription.status !== "active"
    ) {
      return;
    }

    const items = oldSubscription.items.data.map((item) => ({
      price: item.price.id,
      quantity: item.quantity,
    }));

    const newItems = items.map((item) => {
      const newPriceId = prices.get(item.price);
      if (!newPriceId) {
        throw new Error(`Price ${item.price} not found in new account`);
      }
      return {
        price: newPriceId,
        quantity: item.quantity ?? 1,
      };
    });

    const exportItem: SubscriptionExportItem = {
      customer: oldSubscription.customer as string,
      start_date: oldSubscription.current_period_end,
      items: newItems,
      metadata: {
        old_subscription_id: oldSubscription.id,
      },
      automatic_tax: oldSubscription.automatic_tax.enabled ? "TRUE" : "FALSE",
      billing_cycle_anchor: oldSubscription.current_period_end,
      coupon: oldSubscription.discount?.coupon?.id,
      trial_end: oldSubscription.trial_end,
      proration_behavior: "none",
      collection_method: oldSubscription.collection_method,
      default_tax_rate: oldSubscription.default_tax_rates?.[0]?.id
        ? taxes.get(oldSubscription.default_tax_rates?.[0]?.id)
        : undefined,
      backdate_start_date: oldSubscription.start_date,
      days_until_due: oldSubscription.days_until_due,
      cancel_at_period_end: oldSubscription.cancel_at_period_end
        ? "TRUE"
        : "FALSE",
    };

    subscriptionsToExport.push(exportItem);
  });

  await fs.writeFile(
    subscriptionsFilePath,
    await subscriptionsToCsvString(subscriptionsToExport)
  );
}
