"use server";

import { getCollectionsByCustomer, getCollectionsSummary, type CustomerCollection } from "@/lib/yerp/collections";

export type CollectionsData = {
  rows: CustomerCollection[];
  totalReceipt: number;
  totalBalance: number;
  outstandingCustomerCount: number;
};

export async function getCollectionsData(input: {
  startDate: string;
  endDate: string;
  search?: string;
}): Promise<CollectionsData> {
  const [rows, summary] = await Promise.all([
    getCollectionsByCustomer({ startDate: input.startDate, endDate: input.endDate, search: input.search }),
    getCollectionsSummary({ startDate: input.startDate, endDate: input.endDate }),
  ]);

  return { rows, ...summary };
}
