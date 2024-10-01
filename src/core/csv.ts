import { stringify as callbackStringify, parse as callbackParse } from "csv";
import { promisify } from "util";
import { SubscriptionExportItem } from "../commands/export-subscriptions";

export const stringify = promisify<
  Array<Array<string>> | Array<object>,
  { header: boolean; columns: Array<{ key: string; header: string }> },
  string
>(callbackStringify);

const parse = promisify<string, { from_line: number }, Array<Array<string>>>(
  callbackParse
);

export async function mapToCsvString(data: Map<string, string>) {
  return await stringify(Array.from(data), {
    header: true,
    columns: [
      { key: "old_id", header: "old_id" },
      { key: "new_id", header: "new_id" },
    ],
  });
}

export async function csvStringToMap(csv: string) {
  const data = await parse(csv, { from_line: 1 });

  return new Map(
    data.map(([key_0, key_1]) => {
      return [key_0, key_1];
    })
  );
}

export async function arrayToCsvString(data: string[]) {
  return await stringify(
    data.map((key) => [key]),
    {
      header: false,
      columns: [{ key: "value", header: "value" }],
    }
  );
}

export async function subscriptionsToCsvString(data: SubscriptionExportItem[]) {
  let columns = Object.keys(data[0]).map((key) => ({ key, header: key }));

  // Remove the column with key 'metadata'
  columns = columns.filter(
    (column) => column.key !== "metadata" && column.key !== "items"
  );

  columns.push(
    {
      key: "metadata.old_subscription_id",
      header: "metadata.old_subscription_id",
    },
    {
      key: "items.0.price",
      header: "items.0.price",
    },
    {
      key: "items.0.quantity",
      header: "items.0.quantity",
    },
    {
      key: "items.1.price",
      header: "items.1.price",
    },
    {
      key: "items.1.quantity",
      header: "items.1.quantity",
    },
    {
      key: "items.2.price",
      header: "items.2.price",
    },
    {
      key: "items.2.quantity",
      header: "items.2.quantity",
    }
  );

  return await stringify(data, {
    header: true,
    columns,
  });
}
