import { promises as fs } from "fs";
import { mapToCsvString } from "../core/csv";
import { createStripeClient } from "../core/stripe";
import { sanitizeProduct } from "./sanitize/product";

export async function copyProducts(
  filePath: string,
  apiKeyOldAccount: string,
  apiKeyNewAccount: string
) {
  const keyMap = new Map();

  // https://stripe.com/docs/api/products/list
  await createStripeClient(apiKeyOldAccount)
    .products.search({ limit: 100, query: "active:'true'" })
    .autoPagingEach(async (oldProduct) => {
        const newClient = createStripeClient(apiKeyNewAccount);

        const product = await newClient.products.retrieve(oldProduct.id);
        if (product) {
            keyMap.set(oldProduct.id, product.id);
            return;
        }

        const newProduct = await newClient.products.create(sanitizeProduct(oldProduct));

        keyMap.set(oldProduct.id, newProduct.id);
    });

  await fs.writeFile(filePath, await mapToCsvString(keyMap));
}
