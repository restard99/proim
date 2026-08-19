export type NavItem = {
  href: string;
  label: string;
  iconPath: string;
  evenOdd?: boolean;
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
  },
  {
    href: "/collections",
    label: "수금현황",
    iconPath:
      "M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm7 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM5 7a1 1 0 0 0-1 1v2a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1Zm10 0a1 1 0 0 0-1 1v2a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1Z",
    evenOdd: true,
  },
];

export const INVENTORY_NAV_ITEMS: NavItem[] = [
  {
    href: "/inventory",
    label: "재고현황",
    iconPath:
      "M3 6.5 10 3l7 3.5v7L10 17l-7-3.5v-7Zm7 3.5L3 6.5m7 3.5 7-3.5M10 10v7",
    evenOdd: false,
  },
];

export const PRODUCTION_REQUESTS_NAV_ITEMS: NavItem[] = [
  {
    href: "/production-requests",
    label: "생산의뢰서",
    iconPath:
      "M5 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.828a2 2 0 0 0-.586-1.414l-3.828-3.828A2 2 0 0 0 11.172 2H5Zm1 8a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H6Zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H6Z",
    evenOdd: true,
  },
];

export const PRODUCTION_LOGS_NAV_ITEMS: NavItem[] = [
  {
    href: "/production-logs",
    label: "생산일지",
    iconPath:
      "M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.414a1 1 0 0 0-.293-.707l-4.414-4.414A1 1 0 0 0 11.586 3H4Zm6 6a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1H8a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1Z",
  },
];

export const SALTFIELD_NAV_ITEMS: NavItem[] = [
  {
    href: "/saltfield-production",
    label: "생산량",
    iconPath:
      "M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.414a1 1 0 0 0-.293-.707l-4.414-4.414A1 1 0 0 0 11.586 3H4Zm6 6a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1H8a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1Z",
  },
  {
    href: "/saltfield-inventory",
    label: "부자재재고현황",
    iconPath:
      "M3 6.5 10 3l7 3.5v7L10 17l-7-3.5v-7Zm7 3.5L3 6.5m7 3.5 7-3.5M10 10v7",
    evenOdd: false,
  },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    href: "/admin/view-as",
    label: "시스템검토 게시판",
    iconPath:
      "M10 2a5 5 0 100 10 5 5 0 000-10zM3 17a7 7 0 0114 0 1 1 0 01-1 1H4a1 1 0 01-1-1z",
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

// 생산량/부자재재고현황: 염전관리팀 전체(팀원+팀장)
export function canViewSaltfield(team: string | null | undefined, role: string | null | undefined): boolean {
  if (role === "admin") return true;
  return team === "염전관리팀";
}

export function getVisibleBusinessNavItems(
  team: string | null | undefined,
  role: string | null | undefined,
): NavItem[] {
  const items: NavItem[] = [];
  if (canViewSales(team, role)) items.push(...SALES_NAV_ITEMS);
  if (canViewInventory(team, role)) items.push(...INVENTORY_NAV_ITEMS);
  if (canViewProductionRequests(team, role)) items.push(...PRODUCTION_REQUESTS_NAV_ITEMS);
  if (canViewProductionLogs(team, role)) items.push(...PRODUCTION_LOGS_NAV_ITEMS);
  if (canViewSaltfield(team, role)) items.push(...SALTFIELD_NAV_ITEMS);
  return items;
}
