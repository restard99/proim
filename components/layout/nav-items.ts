export type NavItem = {
  href: string;
  label: string;
  iconPath: string;
  evenOdd?: boolean;
  team?: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "홈",
    iconPath: "M10 2 2 8.5V18h5v-6h6v6h5V8.5L10 2Z",
  },
  {
    href: "/schedule",
    label: "일정관리",
    iconPath:
      "M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm10 6H4v8h12V8Z",
  },
  {
    href: "/worklog",
    label: "업무일지",
    iconPath:
      "M5 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.828a2 2 0 0 0-.586-1.414l-3.828-3.828A2 2 0 0 0 11.172 2H5Zm1 8a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H6Zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H6Z",
    evenOdd: true,
  },
];

export const SALES_NAV_ITEMS: NavItem[] = [
  {
    href: "/sales",
    label: "거래처별 매출",
    iconPath:
      "M2 11a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6ZM8 7a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7ZM14 3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3Z",
    team: "영업",
  },
  {
    href: "/collections",
    label: "수금현황",
    iconPath:
      "M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm7 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM5 7a1 1 0 0 0-1 1v2a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1Zm10 0a1 1 0 0 0-1 1v2a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1Z",
    evenOdd: true,
    team: "영업",
  },
];

export const INVENTORY_NAV_ITEMS: NavItem[] = [
  {
    href: "/inventory",
    label: "재고현황",
    iconPath:
      "M3 6.5 10 3l7 3.5v7L10 17l-7-3.5v-7Zm7 3.5L3 6.5m7 3.5 7-3.5M10 10v7",
    evenOdd: false,
    team: "영업채산",
  },
];

export const DISBURSEMENT_NAV_ITEMS: NavItem[] = [
  {
    href: "/disbursements",
    label: "출금조회",
    iconPath: "M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2H3V5Zm0 4h14v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Zm3 3a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H6Z",
    team: "관리자",
  },
];

export const PRODUCTION_REQUESTS_NAV_ITEMS: NavItem[] = [
  {
    href: "/production-requests",
    label: "생산의뢰서",
    iconPath:
      "M5 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.828a2 2 0 0 0-.586-1.414l-3.828-3.828A2 2 0 0 0 11.172 2H5Zm1 8a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H6Zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H6Z",
    evenOdd: true,
    team: "영업채산",
  },
];

export const PRODUCTION_LOGS_NAV_ITEMS: NavItem[] = [
  {
    href: "/production-logs",
    label: "생산일지",
    iconPath:
      "M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.414a1 1 0 0 0-.293-.707l-4.414-4.414A1 1 0 0 0 11.586 3H4Zm6 6a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1H8a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1Z",
    team: "생산",
  },
];

export const PRODUCTION_MATERIAL_INVENTORY_NAV_ITEMS: NavItem[] = [
  {
    href: "/production-material-inventory",
    label: "원재료,반제품 현황",
    iconPath:
      "M3 6.5 10 3l7 3.5v7L10 17l-7-3.5v-7Zm7 3.5L3 6.5m7 3.5 7-3.5M10 10v7",
    evenOdd: false,
    team: "생산",
  },
];

export const SALTFIELD_NAV_ITEMS: NavItem[] = [
  {
    href: "/saltfield-production",
    label: "생산량",
    iconPath:
      "M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.414a1 1 0 0 0-.293-.707l-4.414-4.414A1 1 0 0 0 11.586 3H4Zm6 6a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1H8a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1Z",
    team: "염전관리",
  },
  {
    href: "/saltfield-inventory",
    label: "부자재재고현황",
    iconPath:
      "M3 6.5 10 3l7 3.5v7L10 17l-7-3.5v-7Zm7 3.5L3 6.5m7 3.5 7-3.5M10 10v7",
    evenOdd: false,
    team: "염전관리",
  },
];

export const EXECUTIVE_NAV_ITEMS: NavItem[] = [
  {
    href: "/executive/report",
    label: "주간업무보고",
    iconPath:
      "M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.414a1 1 0 0 0-.293-.707l-4.414-4.414A1 1 0 0 0 11.586 3H4Zm6 6a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1H8a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1Z",
    evenOdd: true,
    team: "임원실",
  },
  {
    href: "/executive/pl",
    label: "손익자료",
    iconPath: "M3 17V3h2v14H3Zm4 0V8h2v9H7Zm4 0V5h2v12h-2Zm4 0v-6h2v6h-2Z",
    team: "임원실",
  },
];

export const SEOMDEULCHAE_SALES_UPLOAD_NAV_ITEMS: NavItem[] = [
  {
    href: "/executive/sales-upload",
    label: "매출업로드",
    iconPath:
      "M10 3a1 1 0 0 1 1 1v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 1 1 1.414-1.414L9 11.586V4a1 1 0 0 1 1-1ZM4 14a1 1 0 0 1 1 1v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1a1 1 0 1 1 2 0v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-1a1 1 0 0 1 1-1Z",
    team: "섬들채",
  },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    href: "/admin/approvals",
    label: "가입 승인 관리",
    iconPath:
      "M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z",
  },
  {
    href: "/admin/view-as",
    label: "시스템검토 게시판",
    iconPath:
      "M10 2a5 5 0 100 10 5 5 0 000-10zM3 17a7 7 0 0114 0 1 1 0 01-1 1H4a1 1 0 01-1-1z",
  },
  {
    href: "/admin/executive-targets",
    label: "매출 목표 관리",
    iconPath:
      "M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.414a1 1 0 0 0-.293-.707l-4.414-4.414A1 1 0 0 0 11.586 3H4Zm6 6a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1H8a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1Z",
    evenOdd: true,
  },
];

// 거래처별 매출/수금현황: 영업팀 전체, 영업채산팀은 팀장만
export function canViewSales(team: string | null | undefined, role: string | null | undefined): boolean {
  if (role === "admin") return true;
  if (team === "영업팀") return true;
  if (team === "영업채산팀" && role === "leader") return true;
  return false;
}

// 재고현황(부자재/완제품/3자물류): 영업채산팀 전체(팀장+팀원)
export function canViewInventory(team: string | null | undefined, role: string | null | undefined): boolean {
  if (role === "admin") return true;
  return team === "영업채산팀";
}

// 출금조회(외상매입금 원장): 관리자 전용
export function canViewDisbursements(team: string | null | undefined, role: string | null | undefined): boolean {
  return role === "admin";
}

// 생산의뢰서(=생산계획서): 영업채산팀 전체(업로드/수정은 팀장만) + 생산팀 전체(조회 전용)
export function canViewProductionRequests(team: string | null | undefined, role: string | null | undefined): boolean {
  if (role === "admin") return true;
  return team === "영업채산팀" || team === "생산팀";
}

// 생산일지: 생산팀 전체(팀원+팀장)
export function canViewProductionLogs(team: string | null | undefined, role: string | null | undefined): boolean {
  if (role === "admin") return true;
  return team === "생산팀";
}

// 원재료,반제품 현황: 생산팀 전체(팀원+팀장) — 생산일지와 동일한 권한
export function canViewProductionMaterialInventory(
  team: string | null | undefined,
  role: string | null | undefined,
): boolean {
  if (role === "admin") return true;
  return team === "생산팀";
}

// 생산량/부자재재고현황: 염전관리팀 전체(팀원+팀장)
export function canViewSaltfield(team: string | null | undefined, role: string | null | undefined): boolean {
  if (role === "admin") return true;
  return team === "염전관리팀";
}

// 주간업무보고/손익자료: 임원실 전용 (사장/회장)
export function canViewExecutive(team: string | null | undefined, role: string | null | undefined): boolean {
  if (role === "admin") return true;
  return team === "임원실";
}

// 매출업로드(섬들채 업장별 실적): 기본은 관리자만 — 섬들채 담당자 중 지정한 사람은 "게시판
// 권한" 화면에서 개인별로 추가 허용해서 쓴다(팀 전체에게 여는 화면이 아니라 개인 지정용).
export function canUploadSeomdeulchaeSales(team: string | null | undefined, role: string | null | undefined): boolean {
  return role === "admin";
}

type MenuCheck = (team: string | null | undefined, role: string | null | undefined) => boolean;

// 업무 메뉴 전체를 한 곳에 모아둔다 — "왼쪽 메뉴에 무엇을 보여줄지"(getVisibleBusinessNavItems)와
// "관리자가 개인별로 추가 허용할 수 있는 메뉴 목록"(GRANTABLE_MENU_ITEMS, 게시판 권한 관리
// 화면)이 서로 다른 곳에 각자 하드코딩되면 새 메뉴 추가 시 한쪽만 고치는 실수가 나기 쉬워서다.
export type BusinessMenuEntry = { item: NavItem; group: string; check: MenuCheck; grantable: boolean };

export const BUSINESS_MENU_ITEMS: BusinessMenuEntry[] = [
  { item: SALES_NAV_ITEMS[0], group: "영업", check: canViewSales, grantable: true },
  { item: SALES_NAV_ITEMS[1], group: "영업", check: canViewSales, grantable: true },
  { item: INVENTORY_NAV_ITEMS[0], group: "영업채산", check: canViewInventory, grantable: true },
  // 출금조회는 관리자 전용 화면이라 개인별로 추가 허용하는 대상에서 제외한다.
  { item: DISBURSEMENT_NAV_ITEMS[0], group: "관리자", check: canViewDisbursements, grantable: false },
  { item: PRODUCTION_REQUESTS_NAV_ITEMS[0], group: "생산", check: canViewProductionRequests, grantable: true },
  { item: PRODUCTION_LOGS_NAV_ITEMS[0], group: "생산", check: canViewProductionLogs, grantable: true },
  {
    item: PRODUCTION_MATERIAL_INVENTORY_NAV_ITEMS[0],
    group: "생산",
    check: canViewProductionMaterialInventory,
    grantable: true,
  },
  { item: SALTFIELD_NAV_ITEMS[0], group: "염전관리", check: canViewSaltfield, grantable: true },
  { item: SALTFIELD_NAV_ITEMS[1], group: "염전관리", check: canViewSaltfield, grantable: true },
  { item: EXECUTIVE_NAV_ITEMS[0], group: "임원실", check: canViewExecutive, grantable: true },
  { item: EXECUTIVE_NAV_ITEMS[1], group: "임원실", check: canViewExecutive, grantable: true },
  {
    item: SEOMDEULCHAE_SALES_UPLOAD_NAV_ITEMS[0],
    group: "섬들채",
    check: canUploadSeomdeulchaeSales,
    grantable: true,
  },
];

// 관리자가 "게시판 권한" 화면에서 개인별로 추가 허용을 켜고 끌 수 있는 메뉴 목록.
export const GRANTABLE_MENU_ITEMS: BusinessMenuEntry[] = BUSINESS_MENU_ITEMS.filter((e) => e.grantable);

export function getVisibleBusinessNavItems(
  team: string | null | undefined,
  role: string | null | undefined,
  grantedHrefs: Set<string> = new Set(),
): NavItem[] {
  return BUSINESS_MENU_ITEMS.filter((e) => e.check(team, role) || grantedHrefs.has(e.item.href)).map((e) => e.item);
}
