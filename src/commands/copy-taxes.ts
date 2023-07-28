import { promises as fs } from 'fs';
import { mapToCsvString } from '../core/csv';
import { createStripeClient } from '../core/stripe';

export async function copyTaxes(filePath: string, apiKeyOldAccount: string, apiKeyNewAccount: string) {
  const keyMap = new Map();

  // https://stripe.com/docs/api/products/list
  await createStripeClient(apiKeyOldAccount)
    .taxRates.list({ limit: 100 })
    .autoPagingEach(async (oldProduct) => {
      const newProduct = await createStripeClient(apiKeyNewAccount).taxRates.create({
        display_name: oldProduct.display_name,
        percentage: oldProduct.percentage,
        active: oldProduct.active,
        inclusive: oldProduct.inclusive,
        state: oldProduct?.state ? oldProduct.state : undefined,
        country: oldProduct?.country ? oldProduct.country : undefined,
        description: oldProduct?.description ? oldProduct.description : undefined,
        jurisdiction: oldProduct?.jurisdiction ? oldProduct.jurisdiction : undefined,
        tax_type: oldProduct?.tax_type ? oldProduct.tax_type : undefined,
      });

      keyMap.set(oldProduct.id, newProduct.id);
    });

  await fs.writeFile(filePath, await mapToCsvString(keyMap));
}
