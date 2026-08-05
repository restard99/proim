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

export const SALES_TEAMS = ["영업팀", "영업채산팀"];

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
