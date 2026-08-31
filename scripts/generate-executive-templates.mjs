// 임원실 대시보드 목표/확정손익 엑셀 템플릿을 생성하는 1회성 스크립트.
// 실행: node scripts/generate-executive-templates.mjs
import ExcelJS from "exceljs";
import fs from "fs";

async function buildTargetsTemplate() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("목표");
  ws.addRow(["구분", "법인/카테고리", "기간유형", "기간", "목표값"]);
  ws.addRow(["매출", "태평소금", "주간", "2026-07-06", 124450000]);
  ws.addRow(["매출", "태평염전", "주간", "2026-07-06", 130065000]);
  ws.addRow(["매출", "섬들채", "주간", "2026-07-06", 29030000]);
  ws.addRow(["매출", "박물관", "주간", "2026-07-06", 3950000]);
  ws.addRow(["매출", "태평소금", "월간", "2026-07", 547600000]);
  ws.addRow(["생산", "천일염", "주간", "2026-07-06", 42345]);
  ws.addRow(["생산", "가공염", "주간", "2026-07-06", 11095]);
  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 18));
  await wb.xlsx.writeFile("public/templates/executive-targets-template.xlsx");
}

async function buildPlConfirmedTemplate() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("확정손익");
  ws.addRow(["법인", "년월", "매출", "매출원가", "판관비", "영업외수익", "영업외비용"]);
  ws.addRow(["태평소금", "2026-07", 607756708, 400000000, 153484733, 500000, 7000000]);
  ws.addRow(["태평염전", "2026-07", 504200633, 350000000, 174638131, 400000, 6500000]);
  ws.addRow(["섬들채", "2026-07", 111479146, 70000000, 77830514, 100000, 2000000]);
  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 16));
  await wb.xlsx.writeFile("public/templates/executive-pl-confirmed-template.xlsx");
}

await buildTargetsTemplate();
await buildPlConfirmedTemplate();
console.log("템플릿 생성 완료: public/templates/executive-targets-template.xlsx, executive-pl-confirmed-template.xlsx");
