import { promises as fs } from 'fs';
import { mapToCsvString } from '../core/csv';
import { createStripeClient } from '../core/stripe';
import { sanitizeProduct } from './sanitize/product';

export async function deleteProducts(filePath: string, apiKeyNewAccount: string, dryRun: boolean = true) {
  if (dryRun) {
    console.log('Dry run, not deleting products');
  }
  const keyMap = new Map();
  let c = 0;
  // https://stripe.com/docs/api/products/list
  await createStripeClient(apiKeyNewAccount)
    .products.list({ limit: 50 })
    .autoPagingEach(async (newProduct) => {
      //   console.log(apiKeyNewAccount, { newProduct });
      c++;
      if (newProduct.livemode) {
        // console.log({ newProduct });
        return;
      }
      if (dryRun === false && newProduct.livemode == false && c < 50) {
        await createStripeClient(apiKeyNewAccount).products.del(newProduct.id);
      }
      //   await createStripeClient(apiKeyNewAccount).products.del(newProduct.id);
      //   keyMap.set(oldProduct.id, newProduct.id);
    });
  console.log({ c });
  //   await fs.writeFile(filePath, await mapToCsvString(keyMap));
}
