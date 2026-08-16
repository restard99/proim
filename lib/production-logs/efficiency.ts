import type { ProductionLogSheet } from "./parse";

export type ProcessEfficiency = {
  processName: string;
  totalHours: number;
  actualHours: number;
  utilizationPct: number;
  stopHours: number;
  prepHours: number;
  restHours: number;
  cleanHours: number;
  breakdownHours: number;
  etcHours: number;
  totalInputQty: number;
  totalWorkers: number;
  productivityPerWorker: number;
};

const EFFICIENCY_REQUIRED_HEADERS = ["총근무시간", "실근무시간"];

function parseNum(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// 순수 함수라 서버(여러 생산일지를 모아 집계)와 클라이언트(선택한 생산일지 1건만 요약)
// 양쪽에서 그대로 재사용한다. "총근무시간"·"실근무시간" 컬럼이 모두 있는 시트만
// 집계 대상으로 삼아, 세척로스율 등 근무시간 데이터가 없는 시트는 자동으로 빠진다.
export function computeProcessEfficiency(sheetsList: ProductionLogSheet[][]): ProcessEfficiency[] {
  const map = new Map<
    string,
    {
      totalHours: number;
      actualHours: number;
      stopHours: number;
      prepHours: number;
      restHours: number;
      cleanHours: number;
      breakdownHours: number;
      etcHours: number;
      totalInputQty: number;
      totalWorkers: number;
    }
  >();

  for (const sheets of sheetsList) {
    for (const sheet of sheets) {
      if (!EFFICIENCY_REQUIRED_HEADERS.every((h) => sheet.headers.includes(h))) continue;
      const hasProcessCol = sheet.headers.includes("공정명");
      for (const dataRow of sheet.rows) {
        const key = hasProcessCol ? dataRow["공정명"] || "미상" : sheet.name;
        const entry = map.get(key) ?? {
          totalHours: 0,
          actualHours: 0,
          stopHours: 0,
          prepHours: 0,
          restHours: 0,
          cleanHours: 0,
          breakdownHours: 0,
          etcHours: 0,
          totalInputQty: 0,
          totalWorkers: 0,
        };
        entry.totalHours += parseNum(dataRow["총근무시간"]);
        entry.actualHours += parseNum(dataRow["실근무시간"]);
        entry.stopHours += parseNum(dataRow["정지시간"]);
        entry.prepHours += parseNum(dataRow["준비"]);
        entry.restHours += parseNum(dataRow["휴게"]);
        entry.cleanHours += parseNum(dataRow["청소"]);
        entry.breakdownHours += parseNum(dataRow["고장"]);
        entry.etcHours += parseNum(dataRow["기타"]);
        // "인당생산성"(주간_월간_업무보고.xlsx) 리포트의 "생산효율지표(정기근로생산량 ÷
        // 인원)" 개념을 참고해, 우리가 실제로 갖고 있는 컬럼(투입량/투입인원)으로 낼 수
        // 있는 유사 지표를 추가한다. 원본 리포트의 완제품 생산량(kg)·정규 인원 기준과는
        // 다른, 공정 단위 투입량/투입인원 기준의 근사치다.
        entry.totalInputQty += parseNum(dataRow["투입량"]);
        entry.totalWorkers += parseNum(dataRow["투입인원"]);
        map.set(key, entry);
      }
    }
  }

  return [...map.entries()]
    .map(([processName, v]) => ({
      processName,
      ...v,
      utilizationPct: v.totalHours > 0 ? (v.actualHours / v.totalHours) * 100 : 0,
      productivityPerWorker: v.totalWorkers > 0 ? v.totalInputQty / v.totalWorkers : 0,
    }))
    .sort((a, b) => b.utilizationPct - a.utilizationPct);
}
