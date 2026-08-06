import "server-only";
import { yerpQuery } from "./client";

const CORP_CODE = "0460";
const FINISHED_GOODS_ASET_SEC = "4";
const PACKAGING_ASET_SEC = "3";

export type MaterialUsage = {
  itemCode: string;
  itemName: string;
  requiredQty: number;
  availableQty: number;
  sufficient: boolean;
};

export type ProductMaterialStatus = {
  matchType: "matched" | "ambiguous" | "unmatched";
  matchedItemName: string | null;
  candidateNames: string[];
  materials: MaterialUsage[];
  allSufficient: boolean;
};

function todayYmd(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

// Y-ERP 품목명은 띄어쓰기가 없는 정식 명칭이라, 생산의뢰서 엑셀의 약식 제품명과
// 글자 그대로는 거의 일치하지 않는다(예: "샘표 꽃소금 1kg" vs "샘표신안바다꽃소금1kg").
// 제품명을 공백 기준으로 토큰화해 정식 명칭 안에 그 순서대로 모두 등장하는지 확인한다
// (SQL의 LIKE '%t1%t2%t3%'과 동일한 매칭을, 완제품 목록을 한 번만 불러와 메모리에서 수행).
function matchesTokens(itmNm: string, tokens: string[]): boolean {
  let idx = 0;
  for (const t of tokens) {
    const found = itmNm.indexOf(t, idx);
    if (found === -1) return false;
    idx = found + t.length;
  }
  return true;
}

export async function getMaterialStatusForItems(
  items: { name: string; qty: number }[],
): Promise<Record<string, ProductMaterialStatus>> {
  const uniqueNames = [...new Set(items.map((i) => i.name).filter(Boolean))];
  if (uniqueNames.length === 0) return {};

  const finishedGoods = await yerpQuery<{ ITM_CD: string; ITM_NM: string }>(
    `
    SELECT ITM_CD, ITM_NM FROM SHUSER.PM_ITEM
    WHERE CORP_CODE = @corpCode AND ASET_SEC = @finishedSec AND USE_YN = '1'
    `,
    { corpCode: CORP_CODE, finishedSec: FINISHED_GOODS_ASET_SEC },
  );

  const matchByName = new Map<string, { itmCd: string; candidates: string[] }>();
  for (const name of uniqueNames) {
    const tokens = name.split(/\s+/).filter(Boolean);
    const candidates = finishedGoods.filter((r) => matchesTokens(r.ITM_NM, tokens));
    matchByName.set(name, {
      itmCd: candidates.length === 1 ? candidates[0].ITM_CD : "",
      candidates: candidates.map((c) => c.ITM_NM),
    });
  }

  const motherCodes = [...new Set([...matchByName.values()].map((m) => m.itmCd).filter(Boolean))];

  const bomByMother = new Map<string, { CHIDL_ITM_CD: string; REAL_DEMAND_QTY: number | null; ITM_NM: string | null }[]>();
  const stockMap = new Map<string, number>();

  if (motherCodes.length > 0) {
    const today = todayYmd();
    const bomRows = await yerpQuery<{
      MOTHER_ITEM_CD: string;
      CHIDL_ITM_CD: string;
      REAL_DEMAND_QTY: number | null;
      ITM_NM: string | null;
    }>(
      `
      SELECT b.MOTHER_ITEM_CD, b.CHIDL_ITM_CD, b.REAL_DEMAND_QTY, i.ITM_NM
      FROM SHUSER.PD_BOM_MGMT b
      JOIN SHUSER.PM_ITEM i ON i.ITM_CD = b.CHIDL_ITM_CD AND i.CORP_CODE = b.CORP_CODE
      WHERE b.CORP_CODE = @corpCode AND i.ASET_SEC = @pkgSec
        AND b.MOTHER_ITEM_CD IN (${motherCodes.map((_, i) => `@m${i}`).join(", ")})
        AND (b.DT_END IS NULL OR b.DT_END >= @today)
      `,
      {
        corpCode: CORP_CODE,
        pkgSec: PACKAGING_ASET_SEC,
        today,
        ...Object.fromEntries(motherCodes.map((c, i) => [`m${i}`, c])),
      },
    );

    for (const row of bomRows) {
      const list = bomByMother.get(row.MOTHER_ITEM_CD) ?? [];
      list.push(row);
      bomByMother.set(row.MOTHER_ITEM_CD, list);
    }

    const childCodes = [...new Set(bomRows.map((r) => r.CHIDL_ITM_CD))];
    if (childCodes.length > 0) {
      const stockRows = await yerpQuery<{ ITM_CD: string; QTY: number | null }>(
        `
        SELECT q.ITM_CD, SUM(CASE WHEN ioc.INOUT_SEC = '1' THEN q.QTY ELSE -q.QTY END) AS QTY
        FROM SHUSER.PM_QTY_IO q
        JOIN SHUSER.PM_IO_CODE ioc ON ioc.IO_SEC = q.IO_SEC AND ioc.CORP_CODE = q.CORP_CODE
        WHERE q.CORP_CODE = @corpCode AND q.QTY_DT <= @today
          AND q.ITM_CD IN (${childCodes.map((_, i) => `@c${i}`).join(", ")})
        GROUP BY q.ITM_CD
        `,
        { corpCode: CORP_CODE, today, ...Object.fromEntries(childCodes.map((c, i) => [`c${i}`, c])) },
      );
      for (const r of stockRows) stockMap.set(r.ITM_CD, Number(r.QTY ?? 0));
    }
  }

  const result: Record<string, ProductMaterialStatus> = {};
  for (const item of items) {
    if (result[item.name]) continue;
    const match = matchByName.get(item.name);
    if (!match || match.candidates.length === 0) {
      result[item.name] = {
        matchType: "unmatched",
        matchedItemName: null,
        candidateNames: [],
        materials: [],
        allSufficient: true,
      };
      continue;
    }
    if (match.candidates.length > 1) {
      result[item.name] = {
        matchType: "ambiguous",
        matchedItemName: null,
        candidateNames: match.candidates,
        materials: [],
        allSufficient: true,
      };
      continue;
    }

    const bom = bomByMother.get(match.itmCd) ?? [];
    const materials: MaterialUsage[] = bom.map((b) => {
      const requiredQty = Number(b.REAL_DEMAND_QTY ?? 0) * item.qty;
      const availableQty = stockMap.get(b.CHIDL_ITM_CD) ?? 0;
      return {
        itemCode: b.CHIDL_ITM_CD,
        itemName: b.ITM_NM ?? b.CHIDL_ITM_CD,
        requiredQty,
        availableQty,
        sufficient: availableQty >= requiredQty,
      };
    });
    result[item.name] = {
      matchType: "matched",
      matchedItemName: match.candidates[0],
      candidateNames: [],
      materials,
      allSufficient: materials.every((m) => m.sufficient),
    };
  }

  return result;
}
