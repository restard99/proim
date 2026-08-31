"use client";

import { useState, useTransition } from "react";
import {
  getWeeklyReport,
  getComments,
  postComment,
  type WeeklyReportData,
  type WeeklyComment,
} from "@/app/actions/executive-report";

const PAGE_TABS = [
  { id: "page1", label: "1. 전 사업장 매출실적" },
  { id: "page2", label: "2. 태평염전 매출" },
  { id: "page3", label: "3. 태평염전 생산" },
  { id: "page4", label: "4. 태평소금 생산" },
  { id: "page5", label: "5. 태평소금 영업" },
  { id: "page6", label: "6. 섬들채 매출" },
] as const;

type PageId = (typeof PAGE_TABS)[number]["id"];

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(iso: string) {
  return iso.replaceAll("-", ".");
}

function won(n: number | null | undefined) {
  if (n === null || n === undefined) return "미입력";
  return Math.round(n).toLocaleString("ko-KR");
}

function kg(n: number | null | undefined) {
  if (n === null || n === undefined) return "미입력";
  return Math.round(n).toLocaleString("ko-KR");
}

function rate(actual: number, plan: number | null): string {
  if (plan === null || plan === 0) return "-";
  return `${((actual / plan) * 100).toFixed(1)}%`;
}

function topNWithRest<T extends { customerName: string; amount: number }>(rows: T[], n: number) {
  const top = rows.slice(0, n);
  const restTotal = rows.slice(n).reduce((s, r) => s + r.amount, 0);
  return { top, restTotal, total: rows.reduce((s, r) => s + r.amount, 0) };
}

export function WeeklyReportView({
  initialWeekStartDate,
  initialReport,
  initialComments,
}: {
  initialWeekStartDate: string;
  initialReport: WeeklyReportData | null;
  initialComments: WeeklyComment[];
}) {
  const [weekStartDate, setWeekStartDate] = useState(initialWeekStartDate);
  const [report, setReport] = useState(initialReport);
  const [comments, setComments] = useState(initialComments);
  const [activePage, setActivePage] = useState<PageId>("page1");
  const [isPending, startTransition] = useTransition();
  const [commentText, setCommentText] = useState("");
  const [isPostingComment, startPostingComment] = useTransition();

  const weekEndDate = addDays(weekStartDate, 6);

  const navigateWeek = (deltaDays: number) => {
    const next = addDays(weekStartDate, deltaDays);
    startTransition(async () => {
      const [nextReport, nextComments] = await Promise.all([getWeeklyReport(next), getComments(next)]);
      setWeekStartDate(next);
      setReport(nextReport);
      setComments(nextComments);
    });
  };

  const handlePostComment = () => {
    const body = commentText.trim();
    if (!body) return;
    startPostingComment(async () => {
      const result = await postComment(weekStartDate, body);
      if (result.ok) {
        setCommentText("");
        setComments(await getComments(weekStartDate));
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="border-b border-mist bg-white px-5 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold text-inktext">주간업무보고</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => navigateWeek(-7)}
            className="rounded-md border border-mist px-3 py-1.5 text-sm text-muted hover:bg-mist/40 disabled:opacity-50"
          >
            ← 지난 주
          </button>
          <span className="text-sm font-medium text-inktext px-2">
            {formatDateLabel(weekStartDate)} ~ {formatDateLabel(weekEndDate)}
          </span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => navigateWeek(7)}
            className="rounded-md border border-mist px-3 py-1.5 text-sm text-muted hover:bg-mist/40 disabled:opacity-50"
          >
            다음 주 →
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl space-y-5 px-5 py-8 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {PAGE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePage(tab.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  activePage === tab.id ? "bg-ink text-salt" : "bg-white text-muted border border-mist"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!report ? (
            <div className="rounded-lg border border-mist bg-white px-4 py-10 text-center text-sm text-muted">
              데이터를 불러올 수 없습니다.
            </div>
          ) : (
            <>
              {activePage === "page1" && <Page1 report={report} />}
              {activePage === "page2" && <Page2 report={report} />}
              {activePage === "page3" && <Page3 report={report} />}
              {activePage === "page4" && <Page4 report={report} />}
              {activePage === "page5" && <Page5 report={report} />}
              {activePage === "page6" && <Page6 report={report} />}
            </>
          )}

          <div className="overflow-hidden rounded-lg border border-mist bg-white">
            <div className="border-b border-mist bg-mist/30 px-4 py-2 text-sm font-semibold">임원 코멘트</div>
            <div className="divide-y divide-mist">
              {comments.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted">아직 코멘트가 없습니다.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="px-4 py-3">
                    <p className="text-sm">
                      <span className="font-medium text-inktext">{c.authorName ?? "익명"}</span>
                      <span className="text-xs text-muted ml-2">
                        {new Date(c.createdAt).toLocaleString("ko-KR")}
                      </span>
                    </p>
                    <p className="text-sm text-inktext mt-1 whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-mist p-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="코멘트를 남겨보세요"
                disabled={isPostingComment}
                className="flex-1 rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
              />
              <button
                type="button"
                onClick={handlePostComment}
                disabled={isPostingComment}
                className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-salt hover:bg-ink2 disabled:opacity-50"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Table({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-mist bg-white">
      <div className="border-b border-mist bg-mist/30 px-4 py-2 text-sm font-semibold">{title}</div>
      <table className="w-full grid-table text-sm">{children}</table>
    </div>
  );
}

function Page1({ report }: { report: WeeklyReportData }) {
  return (
    <div className="space-y-4">
      <Table title={`■ 실적 비교 [단위: 원] (${report.monthLabel} 월간)`}>
        <thead>
          <tr>
            <th className="text-left">구분</th>
            <th>주간 계획</th>
            <th>주간 실적</th>
            <th>달성률</th>
            <th>월간 계획</th>
            <th>월간 실적</th>
            <th>달성률</th>
            <th>전년동월 실적</th>
          </tr>
        </thead>
        <tbody className="text-center">
          {report.page1.corps.map((c) => (
            <tr key={c.corpCode}>
              <td className="text-left font-sans font-medium text-inktext">{c.corpName}</td>
              <td>{won(c.weekPlan)}</td>
              <td className="text-brine">{won(c.weekActual)}</td>
              <td>{rate(c.weekActual, c.weekPlan)}</td>
              <td>{won(c.monthPlan)}</td>
              <td>{won(c.monthActual)}</td>
              <td>{rate(c.monthActual, c.monthPlan)}</td>
              <td>{won(c.lastYearMonthActual)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function CustomerTable({ customers, total }: { customers: WeeklyReportData["page2"]["customers"]; total: number }) {
  const { top, restTotal } = topNWithRest(customers, 8);
  return (
    <Table title="■ 판매처별 실적 [단위: 원]">
      <thead>
        <tr>
          <th className="text-left">판매처명</th>
          <th>금액</th>
        </tr>
      </thead>
      <tbody className="text-center">
        {top.map((c) => (
          <tr key={c.customerCode}>
            <td className="text-left font-sans">{c.customerName}</td>
            <td>{won(c.amount)}</td>
          </tr>
        ))}
        {restTotal > 0 && (
          <tr>
            <td className="text-left font-sans">기타</td>
            <td>{won(restTotal)}</td>
          </tr>
        )}
        <tr className="total-row">
          <td className="text-left font-sans">합계</td>
          <td>{won(total)}</td>
        </tr>
      </tbody>
    </Table>
  );
}

function Page2({ report }: { report: WeeklyReportData }) {
  return <CustomerTable customers={report.page2.customers} total={report.page2.weekActual} />;
}

function Page3({ report }: { report: WeeklyReportData }) {
  const p3 = report.page3;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="rounded-full bg-sand/30 text-inktext px-2 py-0.5">
          염전관리팀 생산량 업로드 연동 (/saltfield-production)
        </span>
      </div>
      {!p3 ? (
        <div className="rounded-lg border border-mist bg-white px-4 py-10 text-center text-sm text-muted">
          이번 주 생산 데이터가 아직 업로드되지 않았습니다.
        </div>
      ) : (
        <Table title="■ 생산 실적 [단위: 20kg/포]">
          <thead>
            <tr>
              <th className="text-left">구분</th>
              <th>계획</th>
              <th>실적</th>
              <th>달성률</th>
            </tr>
          </thead>
          <tbody className="text-center">
            <tr>
              <td className="text-left font-sans font-medium text-inktext">주간</td>
              <td>{won(p3.weeklyPlan)}</td>
              <td>{won(p3.weeklyActual)}</td>
              <td>{rate(p3.weeklyActual ?? 0, p3.weeklyPlan)}</td>
            </tr>
            <tr>
              <td className="text-left font-sans font-medium text-inktext">월간</td>
              <td>{won(p3.monthlyPlan)}</td>
              <td>{won(p3.monthlyActual)}</td>
              <td>{rate(p3.monthlyActual ?? 0, p3.monthlyPlan)}</td>
            </tr>
          </tbody>
        </Table>
      )}
    </div>
  );
}

function Page4({ report }: { report: WeeklyReportData }) {
  return (
    <Table title="■ 주간 생산실적 [단위: kg]">
      <thead>
        <tr>
          <th className="text-left">구분</th>
          <th>주간 계획</th>
          <th>주간 실적</th>
          <th>달성률</th>
          <th>월간 실적</th>
          <th>전년동월 실적</th>
        </tr>
      </thead>
      <tbody className="text-center">
        {report.page4.map((p) => (
          <tr key={p.category}>
            <td className="text-left font-sans font-medium text-inktext">{p.category}</td>
            <td>{kg(p.weekPlan)}</td>
            <td className="text-brine">{kg(p.weekActual)}</td>
            <td>{rate(p.weekActual, p.weekPlan)}</td>
            <td>{kg(p.monthActual)}</td>
            <td>{kg(p.lastYearMonthActual)}</td>
          </tr>
        ))}
        <tr className="total-row">
          <td className="text-left font-sans">합계</td>
          <td>{won(report.page4.reduce((s, p) => s + (p.weekPlan ?? 0), 0) || null)}</td>
          <td>{kg(report.page4.reduce((s, p) => s + p.weekActual, 0))}</td>
          <td>-</td>
          <td>{kg(report.page4.reduce((s, p) => s + p.monthActual, 0))}</td>
          <td>{kg(report.page4.reduce((s, p) => s + p.lastYearMonthActual, 0))}</td>
        </tr>
      </tbody>
    </Table>
  );
}

function Page5({ report }: { report: WeeklyReportData }) {
  return <CustomerTable customers={report.page5.customers} total={report.page5.weekActual} />;
}

function Page6({ report }: { report: WeeklyReportData }) {
  const totalActual = report.page6.channels.reduce((s, c) => s + c.weekActual, 0);
  return (
    <Table title="■ 채널별 매출 실적 [단위: 원]">
      <thead>
        <tr>
          <th className="text-left">구분</th>
          <th>주간 실적</th>
        </tr>
      </thead>
      <tbody className="text-center">
        {report.page6.channels.map((c) => (
          <tr key={c.channel}>
            <td className="text-left font-sans">{c.channel}</td>
            <td>{won(c.weekActual)}</td>
          </tr>
        ))}
        <tr className="total-row">
          <td className="text-left font-sans">합계 (계획: {won(report.page6.weekPlan)})</td>
          <td>{won(totalActual)}</td>
        </tr>
      </tbody>
    </Table>
  );
}
