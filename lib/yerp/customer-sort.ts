// 거래처 목록(매출조회/수금현황)에서 공통으로 쓰는 표시 순서 + 매출조회 화면의 센터별
// 합산 그룹. 브랜드명과 ERP상 등록된 실제 상호가 다른 경우(예: 해표 → 사조대림)가 있어
// 항목마다 여러 별칭을 매칭할 수 있게 배열로 둔다. 여기 없는 거래처는 뒤이어 가나다순으로 표시된다.
//
// excludeKeywords: alias가 우연히 포함돼 있어도 실제로는 다른 회사/계정이라 묶으면 안 되는
// 경우를 걸러낸다(사용자 확인 — 실제 거래처명을 다 뒤져서 애매한 항목을 하나씩 확인함).
export type CustomerGroupDef = {
  label: string;
  aliases: string[];
  excludeKeywords?: string[];
};

// 표시 순서 자체가 우선순위다(사용자가 고정 요청한 순서: 샘표/해표/롯데/이마트/지에스리테일/
// 농협/신세계푸드/이랜드리테일/섬들채) — 배열 순서를 바꾸면 화면 표시 순서도 그대로 바뀐다.
const PRIORITY_GROUPS: CustomerGroupDef[] = [
  { label: "샘표", aliases: ["샘표"] },
  { label: "해표", aliases: ["해표", "사조대림"] },
  // 롯데마트/슈퍼/Market999/VIC마켓/프리미엄푸드마켓 등 전부 포함, 렌터카·IT 계열사만 제외(사용자 확인)
  { label: "롯데", aliases: ["롯데"], excludeKeywords: ["롯데렌탈", "롯데이노베이트"] },
  // "(주)부방유통 이마트 안양점"도 포함(사용자 확인 — 이마트 안양점 납품 대행업체로 보이지만 합쳐서 보기로 함)
  { label: "이마트", aliases: ["이마트"] },
  // "지에스"가 아니라 "지에스리테일"로 매칭 — 한국에스지에스(SGS)·지에스넷비전 같은 우연한 오매칭을 자동으로 배제(사용자 확인)
  { label: "지에스리테일", aliases: ["지에스리테일"] },
  // "농협" 포함이면 다 합침(농협경제지주 마트사업 등 실제 매출도 있음 — 사용자 확인,
  // 819,440원짜리 농협경제지주(주) 마트사업중부지사 매출이 안 잡혀서 "하나로마트"로 좁혔던
  // 걸 되돌림). 은행/법인카드/서울우유농협(별개 조합)만 제외한다.
  { label: "농협", aliases: ["농협"], excludeKeywords: ["은행", "카드", "우유"] },
  // "신세계"가 아니라 "신세계푸드"로 매칭 — 신세계 백화점 본점/신세계아이앤씨(IT)/
  // 신세계엘앤비(와인) 같은 다른 계열사를 배제한다(사용자 확인).
  { label: "신세계푸드", aliases: ["신세계푸드"] },
  // 이랜드리테일(뉴코아/킴스클럽 등)도 "이랜드"로 묶어서 매칭한다.
  { label: "이랜드리테일", aliases: ["이랜드"] },
  { label: "섬들채", aliases: ["섬들채"] },
];

function groupIndexOf(customerName: string): number {
  return PRIORITY_GROUPS.findIndex((g) => {
    if (!g.aliases.some((a) => customerName.includes(a))) return false;
    if (g.excludeKeywords?.some((k) => customerName.includes(k))) return false;
    return true;
  });
}

function customerPriorityRank(customerName: string): number {
  const idx = groupIndexOf(customerName);
  return idx === -1 ? PRIORITY_GROUPS.length : idx;
}

// 이 거래처명이 속한 그룹의 표시 라벨(예: "이마트")을 반환한다. 어느 그룹에도 안 속하면 null.
export function getCustomerGroupLabel(customerName: string): string | null {
  const idx = groupIndexOf(customerName);
  return idx === -1 ? null : PRIORITY_GROUPS[idx].label;
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

export type CustomerSalesLike = {
  customerCode: string;
  customerName: string;
  amount: number;
  lastTradeDate: string | null;
};

export type GroupedCustomerSales = {
  key: string; // 그룹이면 "group:라벨", 아니면 원래 거래처코드
  displayName: string; // 그룹이면 그룹 라벨(예: "이마트"), 아니면 원래 거래처명
  amount: number;
  lastTradeDate: string | null;
  isGroup: boolean;
  details: CustomerSalesLike[]; // isGroup일 때만 여러 건 — 클릭했을 때 펼쳐 보여줄 원본 거래처별 내역
};

// 센터/지점별로 흩어진 거래처를 브랜드 단위로 합쳐서 하나의 행으로 만든다("2. 태평염전
// 매출"이 아니라 영업부 "거래처별 매출" 화면 전용). 그룹에 안 속한 거래처는 그대로 개별
// 행으로 남는다.
export function groupCustomerSales<T extends CustomerSalesLike>(rows: T[]): GroupedCustomerSales[] {
  const groups = new Map<string, GroupedCustomerSales>();
  // 그룹의 표시 라벨(예: "농협")과 실제 매칭 별칭(예: "하나로마트")이 다를 수 있어(FEAT-014
  // TASK 후속 수정 — 라벨을 원래 별칭에서 바꾼 그룹이 생김), 정렬 순위는 원래 거래처명으로
  // 찾아낸 그룹 인덱스를 그대로 저장해 두고 쓴다. 라벨 문자열로 다시 순위를 찾으면(예:
  // "농협"이 "하나로마트" 별칭에 안 걸려서) 매칭이 깨져 정렬 순서 밖으로 밀려난다.
  const groupRank = new Map<string, number>();
  const ungrouped: GroupedCustomerSales[] = [];

  for (const row of rows) {
    const idx = groupIndexOf(row.customerName);
    if (idx === -1) {
      ungrouped.push({
        key: row.customerCode,
        displayName: row.customerName,
        amount: row.amount,
        lastTradeDate: row.lastTradeDate,
        isGroup: false,
        details: [],
      });
      continue;
    }
    const label = PRIORITY_GROUPS[idx].label;
    groupRank.set(label, idx);
    let g = groups.get(label);
    if (!g) {
      g = { key: `group:${label}`, displayName: label, amount: 0, lastTradeDate: null, isGroup: true, details: [] };
      groups.set(label, g);
    }
    g.amount += row.amount;
    g.details.push(row);
    if (row.lastTradeDate && (!g.lastTradeDate || row.lastTradeDate > g.lastTradeDate)) {
      g.lastTradeDate = row.lastTradeDate;
    }
  }

  for (const g of groups.values()) g.details.sort((a, b) => b.amount - a.amount);

  const rankOf = (row: GroupedCustomerSales) =>
    row.isGroup ? (groupRank.get(row.displayName) ?? PRIORITY_GROUPS.length) : customerPriorityRank(row.displayName);

  return [...groups.values(), ...ungrouped].sort((a, b) => {
    const rankA = rankOf(a);
    const rankB = rankOf(b);
    if (rankA !== rankB) return rankA - rankB;
    if (rankA === PRIORITY_GROUPS.length) return a.displayName.localeCompare(b.displayName, "ko");
    return b.amount - a.amount;
  });
}
