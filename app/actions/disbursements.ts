"use server";

import ExcelJS from "exceljs";
import {
  getDisbursementsByVendor,
  getVendorLedger,
  getAllVendorLedgerEntries,
  type DisbursementCorpCode,
  type VendorDisbursement,
  type VendorLedger,
} from "@/lib/yerp/disbursements";
import { YERP_CORPS } from "@/lib/yerp/corps";

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

export type ExportResult = { ok: true; base64: string; fileName: string } | { ok: false; message: string };

function formatSlipDateDot(ymd: string) {
  if (ymd.length !== 8) return ymd;
  return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}

export async function exportDisbursementsExcel(input: {
  corpCode: DisbursementCorpCode;
  startDate: string;
  endDate: string;
  search?: string;
}): Promise<ExportResult> {
  const vendors = await getDisbursementsByVendor(input);
  if (vendors.length === 0) {
    return { ok: false, message: "내보낼 데이터가 없습니다." };
  }

  const ledgers = await getAllVendorLedgerEntries({ ...input, vendors });
  const corpName = YERP_CORPS.find((c) => c.corpCode === input.corpCode)?.corpName ?? input.corpCode;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`${corpName} 출금조회`);

  ws.addRow([`${corpName} 출금조회 (${formatSlipDateDot(input.startDate)} ~ ${formatSlipDateDot(input.endDate)})`]);
  ws.addRow([]);
  ws.addRow(["매입처", "기초잔액", "매입발생", "지급액", "기말잔액"]);
  for (const v of vendors) {
    ws.addRow([v.vendorName, v.beginBalance, v.periodPurchase, v.periodPayment, v.balance]);
  }

  ws.addRow([]);
  ws.addRow(["매입처", "일자", "구분", "적요·상대계정", "금액", "잔액"]);
  for (const ledger of ledgers) {
    ws.addRow([ledger.vendorName]);
    for (const entry of ledger.entries) {
      ws.addRow([
        "",
        formatSlipDateDot(entry.slipDate),
        entry.debCrd === "4" ? "매입발생" : "지급",
        entry.note || entry.counterAccount || "-",
        entry.amount,
        entry.runningBalance,
      ]);
    }
  }

  ws.getRow(1).font = { bold: true, size: 13 };
  ws.getRow(3).font = { bold: true };
  ws.getRow(4 + vendors.length + 1).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 18));

  const buffer = await wb.xlsx.writeBuffer();
  return {
    ok: true,
    base64: Buffer.from(buffer).toString("base64"),
    fileName: `${corpName}_출금조회_${input.startDate}_${input.endDate}.xlsx`,
  };
}
