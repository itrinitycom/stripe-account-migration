import { promises as fs } from "fs";
import { mapToCsvString, arrayToCsvString } from "../core/csv";
import { createStripeClient } from "../core/stripe";
import { sanitizePrice } from "./sanitize/price";
import Stripe from "stripe";
import { setTimeout } from "timers/promises";

export async function copyPrices(
  newPricesFilePath: string,
  pricesFilePath: string,
  apiKeyOldAccount: string,
  apiKeyNewAccount: string
) {
  const keyMap = new Map();
  const createdPrices = new Array<string>();

  try {
    await createStripeClient(apiKeyOldAccount)
      .products.search({
        limit: 100,
        query: "active:'true'",
      })
      // product have same ID in both accounts
      .autoPagingEach(async (product) => {
        console.log(
          new Date(),
          `Processing product ${product.name} (${product.id})`
        );
        const oldPrices = await createStripeClient(apiKeyOldAccount)
          .prices.search({
            limit: 100,
            expand: ["data.currency_options", "data.tiers"],
            query: `active:'true' AND product:'${product.id}'`,
          })
          .autoPagingToArray({ limit: 10000 });

        const newPrices = await createStripeClient(apiKeyNewAccount)
          .prices.search({
            limit: 100,
            query: `active:'true' AND product:'${product.id}'`,
          })
          .autoPagingToArray({ limit: 10000 });

        // we can assume that in case of same number of prices, they are the same
        if (oldPrices.length === newPrices.length) {
          console.log(
            new Date(),
            `Product ${product.name} (${product.id}) already has the same number of prices`
          );
          return;
        }

        for (const oldPrice of oldPrices) {
          let newPrice = findMatchingPrice(newPrices, oldPrice);

          if (!newPrice) {
            // wait 1s due to Stripe rate limits
            await setTimeout(1000);
            newPrice = await createStripeClient(apiKeyNewAccount).prices.create(
              sanitizePrice(oldPrice, product.id)
            );
            newPrices.push(newPrice);
            createdPrices.push(newPrice.id);
          }

          // update default price
          if (product.default_price === oldPrice.id) {
            await createStripeClient(apiKeyNewAccount).products.update(
              product.id,
              {
                default_price: newPrice.id,
              }
            );
          }

          keyMap.set(oldPrice.id, newPrice.id);
        }

        // wait 1s due to Stripe rate limits
        await setTimeout(1000);
      });
  } catch (error) {
    console.error(error);
  }

  await fs.writeFile(pricesFilePath, await mapToCsvString(keyMap));
  await fs.writeFile(newPricesFilePath, await arrayToCsvString(createdPrices));
}

function findMatchingPrice(
  priceHeystack: Stripe.Price[],
  priceNeedle: Stripe.Price
) {
  return priceHeystack.find((price) => {
    return (
      price.unit_amount === priceNeedle.unit_amount &&
      price.currency === priceNeedle.currency
    );
  });
}
