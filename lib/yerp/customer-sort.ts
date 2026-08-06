// 거래처 목록(매출조회/수금현황)에서 공통으로 쓰는 표시 순서.
// 브랜드명과 ERP상 등록된 실제 상호가 다른 경우(예: 해표 → 사조대림)가 있어
// 항목마다 여러 별칭을 매칭할 수 있게 배열로 둔다. 여기 없는 거래처는 뒤이어 가나다순으로 표시된다.
const PRIORITY_GROUPS: string[][] = [
  ["샘표"],
  ["해표", "사조대림"],
  ["이마트"],
  ["롯데"],
  ["지에스"],
  ["농협"],
  ["신세계"],
  ["섬들채"],
];

function customerPriorityRank(customerName: string): number {
  const idx = PRIORITY_GROUPS.findIndex((aliases) => aliases.some((a) => customerName.includes(a)));
  return idx === -1 ? PRIORITY_GROUPS.length : idx;
}

// 우선순위 거래처 목록 순서대로 배치하고, 같은 거래처명(예: 이마트 여러 지점)의
// 건은 서로 흩어지지 않게 묶어서 보여준다. 우선순위 밖의 거래처는 가나다순으로 정렬한다.
export function sortByPriorityCustomer<T extends { customerName: string }>(
  rows: T[],
  tiebreak: (a: T, b: T) => number,
): T[] {
  return [...rows].sort((a, b) => {
    const rankA = customerPriorityRank(a.customerName);
    const rankB = customerPriorityRank(b.customerName);
    if (rankA !== rankB) return rankA - rankB;
    if (rankA === PRIORITY_GROUPS.length) {
      return a.customerName.localeCompare(b.customerName, "ko");
    }
    return tiebreak(a, b);
  });
}
