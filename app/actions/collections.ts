"use server";

import {
  getCollectionsByCustomer,
  getCustomerLedger,
  type CustomerCollection,
  type CustomerLedger,
  type YerpCorpCode,
} from "@/lib/yerp/collections";

export type CollectionsData = {
  rows: CustomerCollection[];
  totalReceipt: number;
  totalBalance: number;
  outstandingCustomerCount: number;
};

export async function getCollectionsData(input: {
  corpCode: YerpCorpCode;
  startDate: string;
  endDate: string;
  search?: string;
}): Promise<CollectionsData> {
  const rows = await getCollectionsByCustomer({
    corpCode: input.corpCode,
    startDate: input.startDate,
    endDate: input.endDate,
    search: input.search,
  });

  const totalReceipt = rows.reduce((sum, r) => sum + r.periodReceipt, 0);
  const totalBalance = rows.reduce((sum, r) => sum + r.balance, 0);
  const outstandingCustomerCount = rows.filter((r) => r.balance > 0).length;

  return { rows, totalReceipt, totalBalance, outstandingCustomerCount };
}

export async function getCustomerLedgerData(input: {
  corpCode: YerpCorpCode;
  customerCode: string;
  startDate: string;
  endDate: string;
}): Promise<CustomerLedger> {
  return getCustomerLedger(input);
}
