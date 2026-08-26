"use server";

import {
  getDisbursementsByVendor,
  getVendorLedger,
  type DisbursementCorpCode,
  type VendorDisbursement,
  type VendorLedger,
} from "@/lib/yerp/disbursements";

export type DisbursementsData = {
  rows: VendorDisbursement[];
  totalPayment: number;
  totalBalance: number;
  outstandingVendorCount: number;
};

export async function getDisbursementsData(input: {
  corpCode: DisbursementCorpCode;
  startDate: string;
  endDate: string;
  search?: string;
}): Promise<DisbursementsData> {
  const rows = await getDisbursementsByVendor({
    corpCode: input.corpCode,
    startDate: input.startDate,
    endDate: input.endDate,
    search: input.search,
  });

  const totalPayment = rows.reduce((sum, r) => sum + r.periodPayment, 0);
  const totalBalance = rows.reduce((sum, r) => sum + r.balance, 0);
  const outstandingVendorCount = rows.filter((r) => r.balance > 0).length;

  return { rows, totalPayment, totalBalance, outstandingVendorCount };
}

export async function getVendorLedgerData(input: {
  corpCode: DisbursementCorpCode;
  vendorCode: string;
  startDate: string;
  endDate: string;
}): Promise<VendorLedger> {
  return getVendorLedger(input);
}
