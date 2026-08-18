"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, type NavItem } from "./nav-items";
import { signOut } from "@/app/actions/auth";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function LogoBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-white px-4 py-0 shadow-sm shadow-black/20 w-fit">
      <Image src="/logo.png" alt="태평염전 로고" width={403} height={143} className="h-14 w-auto" />
    </span>
  );
}

function NavLinkRow({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`nav-link flex items-center gap-3 rounded-lg pl-3 pr-3 py-2 text-sm font-medium ${active ? "active" : ""}`}
    >
      <span className="nav-accent" />
      <span className="nav-icon-wrap">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d={item.iconPath} fillRule={item.evenOdd ? "evenodd" : undefined} clipRule={item.evenOdd ? "evenodd" : undefined} />
        </svg>
      </span>
      {item.label}
    </Link>
  );
}

function NavLinks({
  pathname,
  businessNavItems,
  userTeam,
  onNavigate,
}: {
  pathname: string;
  businessNavItems: NavItem[];
  userTeam: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 px-6 py-6 space-y-1">
      <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-salt/30">메뉴</p>
      {NAV_ITEMS.map((item) => (
        <NavLinkRow key={item.href} item={item} active={isActive(pathname, item.href)} onNavigate={onNavigate} />
      ))}
      {businessNavItems.length > 0 && (
        <>
          <p className="px-1 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-salt/30">{userTeam}</p>
          {businessNavItems.map((item) => (
            <NavLinkRow key={item.href} item={item} active={isActive(pathname, item.href)} onNavigate={onNavigate} />
          ))}
        </>
      )}
    </nav>
  );
}

function ProfileFooter({
  userName,
  userTeam,
  onNavigate,
}: {
  userName: string;
  userTeam: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="mx-3 mb-3 flex items-center gap-1">
      <Link
        href="/account"
        onClick={onNavigate}
        className="flex flex-1 min-w-0 items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-white/5"
      >
        <div className="h-8 w-8 rounded-full bg-white/10 ring-1 ring-white/15 flex items-center justify-center text-xs font-medium shrink-0">
          {userName.slice(0, 1)}
        </div>
        <div className="min-w-0 text-left">
          <p className="text-sm font-medium text-salt truncate">{userName}</p>
          <p className="text-xs text-salt/50 truncate">{userTeam}</p>
        </div>
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          title="로그아웃"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-salt/40 hover:text-salt hover:bg-white/5 transition-colors shrink-0"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3 3a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H5v12h5a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1V3Zm10.3 3.3a1 1 0 0 1 1.4 0l3 3a1 1 0 0 1 0 1.4l-3 3a1 1 0 1 1-1.4-1.4L14.58 11H8a1 1 0 1 1 0-2h6.58l-1.28-1.3a1 1 0 0 1 0-1.4Z"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}

export function AppShell({
  userName,
  userTeam,
  businessNavItems = [],
  children,
}: {
  userName: string;
  userTeam: string;
  businessNavItems?: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentLabel =
    [...NAV_ITEMS, ...businessNavItems].find((item) => isActive(pathname, item.href))?.label ?? "";

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col bg-ink text-salt lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <LogoBadge />
        </div>
        <NavLinks pathname={pathname} businessNavItems={businessNavItems} userTeam={userTeam} />
        <ProfileFooter userName={userName} userTeam={userTeam} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="flex w-72 max-w-[80%] flex-col bg-ink text-salt shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-6">
              <LogoBadge />
              <button type="button" className="text-salt/70" onClick={() => setMobileOpen(false)} aria-label="닫기">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4.3 4.3a1 1 0 0 1 1.4 0L10 8.6l4.3-4.3a1 1 0 1 1 1.4 1.4L11.4 10l4.3 4.3a1 1 0 0 1-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 0 1-1.4-1.4L8.6 10 4.3 5.7a1 1 0 0 1 0-1.4Z"
                  />
                </svg>
              </button>
            </div>
            <NavLinks
              pathname={pathname}
              businessNavItems={businessNavItems}
              userTeam={userTeam}
              onNavigate={() => setMobileOpen(false)}
            />
            <ProfileFooter userName={userName} userTeam={userTeam} onNavigate={() => setMobileOpen(false)} />
          </div>
          <button
            type="button"
            className="flex-1 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-label="배경 닫기"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-mist bg-white px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-inktext lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="메뉴 열기"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M2 5a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1Zm1 4a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H3Z"
                />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-inktext">{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" className="text-muted hover:text-inktext" aria-label="알림">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 0 0-6 6v3.09c0 .5-.2.98-.55 1.33L2 14h16l-1.45-1.58A1.9 1.9 0 0 1 16 11.1V8a6 6 0 0 0-6-6Zm0 16a2.2 2.2 0 0 0 2.2-2H7.8A2.2 2.2 0 0 0 10 18Z" />
              </svg>
            </button>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mist text-xs font-medium text-inktext">
                {userName.slice(0, 1)}
              </div>
              <span className="hidden font-medium text-inktext sm:inline">{userName}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-salt">{children}</main>
      </div>
    </div>
  );
}
