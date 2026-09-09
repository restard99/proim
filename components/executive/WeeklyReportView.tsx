"use client";

import { useState, useTransition } from "react";
import {
  getWeeklyReport,
  getComments,
  postComment,
  getRangeActualsReport,
  type WeeklyReportData,
  type WeeklyReportPage1Corp,
  type WeeklyComment,
  type TopSellingProduct,
  type RangeActualsReport,
  type RangeTopProduct,
} from "@/app/actions/executive-report";
import type { YeomjeonProductionSnapshot } from "@/lib/executive/parse-yeomjeon-production";

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

// "YYYY-MM"의 마지막 날짜("YYYY-MM-DD")를 구한다.
function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${String(lastDay).padStart(2, "0")}`;
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${y}.${m}`;
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

// 이미 비율(0.835 등)로 계산돼 있는 값을 퍼센트 문자열로 바꾼다(태평염전 생산실적 스냅샷처럼
// 조회 시점이 아니라 업로드 시점에 이미 계산돼 저장된 값에 쓴다).
function pct(ratio: number | null): string {
  if (ratio === null) return "-";
  return `${(ratio * 100).toFixed(1)}%`;
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
  yeomjeonProduction,
}: {
  initialWeekStartDate: string;
  initialReport: WeeklyReportData | null;
  initialComments: WeeklyComment[];
  yeomjeonProduction: YeomjeonProductionSnapshot | null;
}) {
  const [weekStartDate, setWeekStartDate] = useState(initialWeekStartDate);
  const [report, setReport] = useState(initialReport);
  const [comments, setComments] = useState(initialComments);
  const [activePage, setActivePage] = useState<PageId>("page1");
  const [isPending, startTransition] = useTransition();
  const [commentText, setCommentText] = useState("");
  const [isPostingComment, startPostingComment] = useTransition();
  const [rangeReport, setRangeReport] = useState<RangeActualsReport | null>(null);
  const [isPendingRange, startRangeTransition] = useTransition();

  const weekEndDate = addDays(weekStartDate, 6);

  const loadWeek = (next: string) => {
    startTransition(async () => {
      const [nextReport, nextComments] = await Promise.all([getWeeklyReport(next), getComments(next)]);
      setWeekStartDate(next);
      setReport(nextReport);
      setComments(nextComments);
    });
  };

  const navigateWeek = (deltaDays: number) => loadWeek(addDays(weekStartDate, deltaDays));

  // 달력 버튼: 첫 클릭한 달을 시작월로, 두 번째 클릭한 달을 종료월(그 달 마지막 날까지)로 잡아
  // 기간 실적 합산 조회로 전환한다. 계획 데이터는 주/월 단위 스냅샷이라 범위 합산에 의미가 없어
  // 실적만 조회한다.
  const handleRangeSelect = (startYm: string, endYm: string) => {
    const [a, b] = startYm <= endYm ? [startYm, endYm] : [endYm, startYm];
    const rangeStart = `${a}-01`;
    const rangeEnd = lastDayOfMonth(b);
    startRangeTransition(async () => {
      const result = await getRangeActualsReport(rangeStart, rangeEnd);
      setRangeReport(result);
    });
  };

  const exitRangeMode = () => setRangeReport(null);

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
          <span className="w-px self-stretch bg-mist mx-1" aria-hidden />
          {rangeReport ? (
            <>
              <span className="text-sm font-medium text-inktext px-2">
                기간 실적 {formatMonthLabel(rangeReport.rangeStart.slice(0, 7))} ~{" "}
                {formatMonthLabel(rangeReport.rangeEnd.slice(0, 7))}
              </span>
              <button
                type="button"
                onClick={exitRangeMode}
                className="rounded-md border border-mist px-3 py-1.5 text-sm text-muted hover:bg-mist/40"
              >
                주간 보고로 돌아가기
              </button>
            </>
          ) : (
            <MonthRangePicker disabled={isPendingRange} onSelect={handleRangeSelect} />
          )}
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

          {rangeReport ? (
            <>
              {activePage === "page1" && <RangePage1 report={rangeReport} />}
              {activePage === "page2" && <CustomerTable customers={rangeReport.page2.customers} total={rangeReport.page2.actual} />}
              {activePage === "page3" && <RangePage3 report={rangeReport} />}
              {activePage === "page4" && <RangePage4 report={rangeReport} />}
              {activePage === "page5" && <CustomerTable customers={rangeReport.page5.customers} total={rangeReport.page5.actual} />}
              {activePage === "page6" && <RangePage6 report={rangeReport} />}
            </>
          ) : !report ? (
            <div className="rounded-lg border border-mist bg-white px-4 py-10 text-center text-sm text-muted">
              데이터를 불러올 수 없습니다.
            </div>
          ) : (
            <>
              {activePage === "page1" && <Page1 report={report} />}
              {activePage === "page2" && <Page2 report={report} />}
              {activePage === "page3" && <Page3 production={yeomjeonProduction} />}
              {activePage === "page4" && <Page4 report={report} />}
              {activePage === "page5" && <Page5 report={report} />}
              {activePage === "page6" && <Page6 report={report} />}
            </>
          )}

          {!rangeReport && (
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
          )}
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

// PPT 주간업무보고 개별 법인 페이지(예: "3. 태평염전") 상단에 있는 "■ 주간 매출 실적" 표를
// 그대로 옮긴 것 — 1페이지(전 사업장 매출실적)의 그 법인 행과 같은 데이터를, 주간/월간/전년동월
// 그룹 헤더로 보여준다.
function CorpWeeklySummaryTable({ corp }: { corp: WeeklyReportPage1Corp }) {
  return (
    <Table title="■ 주간 매출 실적 [단위: 원]">
      <thead>
        <tr>
          <th colSpan={3}>주간</th>
          <th colSpan={3}>월간</th>
          <th colSpan={2}>전년 동월</th>
        </tr>
        <tr>
          <th>계획</th>
          <th>실적</th>
          <th>달성률</th>
          <th>계획</th>
          <th>실적</th>
          <th>달성률</th>
          <th>실적</th>
          <th>대비율</th>
        </tr>
      </thead>
      <tbody className="text-center">
        <tr>
          <td>{won(corp.weekPlan)}</td>
          <td className="text-brine">{won(corp.weekActual)}</td>
          <td>{rate(corp.weekActual, corp.weekPlan)}</td>
          <td>{won(corp.monthPlan)}</td>
          <td>{won(corp.monthActual)}</td>
          <td>{rate(corp.monthActual, corp.monthPlan)}</td>
          <td>{won(corp.lastYearMonthActual)}</td>
          <td>{rate(corp.monthActual, corp.lastYearMonthActual)}</td>
        </tr>
      </tbody>
    </Table>
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
  const yeomjeon = report.page1.corps.find((c) => c.corpCode === "0400");
  return (
    <div className="space-y-4">
      {yeomjeon && <CorpWeeklySummaryTable corp={yeomjeon} />}
      <CustomerTable customers={report.page2.customers} total={report.page2.weekActual} />
    </div>
  );
}

// PPT 주간업무보고 "■ 태평염전 생산실적" + "■ 공구별 생산 실적" 페이지를 그대로 옮겼다.
// "생산-염전" 탭에서 워크북을 업로드할 때마다 통째로 갱신되는 스냅샷이라, 조회 중인 주와
// 무관하게 항상 최근 업로드 기준 값을 보여준다(주 단위로 거슬러 올라가는 값이 아님).
function Page3({ production }: { production: YeomjeonProductionSnapshot | null }) {
  if (!production) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="rounded-full bg-sand/30 text-inktext px-2 py-0.5">매출목표관리 워크북 업로드 연동</span>
        </div>
        <div className="rounded-lg border border-mist bg-white px-4 py-10 text-center text-sm text-muted">
          아직 생산실적 데이터가 업로드되지 않았습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="rounded-full bg-sand/30 text-inktext px-2 py-0.5">
          기준일: {formatDateLabel(production.asOfDate)} (매출목표관리 워크북 업로드 연동, 최근 업로드 기준)
        </span>
      </div>

      <Table title="■ 태평염전 생산실적 [단위: 20kg/포, %]">
        <thead>
          <tr>
            <th className="text-left" rowSpan={2}>
              월
            </th>
            <th colSpan={3}>월 생산목표</th>
            <th colSpan={2}>전년 동월</th>
            <th colSpan={3}>연누계</th>
          </tr>
          <tr>
            <th>계획</th>
            <th>실적</th>
            <th>달성률</th>
            <th>실적</th>
            <th>대비율</th>
            <th>당해</th>
            <th>전년</th>
            <th>대비율</th>
          </tr>
        </thead>
        <tbody className="text-center">
          {production.monthRows.map((m) => (
            <tr key={m.monthLabel} className={m.monthLabel === "합계" ? "total-row" : undefined}>
              <td className="text-left font-sans">{m.monthLabel}</td>
              <td>{won(m.plan)}</td>
              <td>{won(m.actual)}</td>
              <td>{pct(m.achievementRate)}</td>
              <td>{won(m.lastYearActual)}</td>
              <td>{pct(m.vsLastYearRate)}</td>
              <td>{won(m.ytdThisYear)}</td>
              <td>{won(m.ytdLastYear)}</td>
              <td>{pct(m.ytdRate)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Table title="■ 공구별 생산 실적 [단위: 20kg/포, %]">
        <thead>
          <tr>
            <th className="text-left">공구</th>
            <th>주간</th>
            <th>월간</th>
            <th>연간 생산</th>
            <th>비율</th>
            <th>전년 동월 누계 생산량</th>
            <th>대비율</th>
          </tr>
        </thead>
        <tbody className="text-center">
          <tr>
            <td className="text-left font-sans">계획</td>
            <td>{won(production.fieldWeeklyPlan)}</td>
            <td>{won(production.fieldMonthlyPlan)}</td>
            <td>{won(production.fieldAnnualPlan)}</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
          </tr>
          {production.fieldRows.map((f) => (
            <tr key={f.field} className={f.field === "합계" ? "total-row" : undefined}>
              <td className="text-left font-sans">{f.field}</td>
              <td>{won(f.weeklyActual)}</td>
              <td>{won(f.monthlyActual)}</td>
              <td>{won(f.annualActual)}</td>
              <td>{pct(f.annualRatio)}</td>
              <td>{won(f.lastYearYtd)}</td>
              <td>{pct(f.vsLastYearRate)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
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

function TopProductsTable({ products }: { products: TopSellingProduct[] }) {
  return (
    <Table title="■ 판매상품별 매출상위(월간 누적 기준) [단위: 원]">
      <thead>
        <tr>
          <th className="text-left">상품명</th>
          <th>주간 수량</th>
          <th>주간 금액</th>
          <th>월간 수량</th>
          <th>월간 금액</th>
        </tr>
      </thead>
      <tbody className="text-center">
        {products.length === 0 ? (
          <tr>
            <td colSpan={5} className="py-6 text-sm text-muted">
              데이터가 없습니다.
            </td>
          </tr>
        ) : (
          products.map((p) => (
            <tr key={p.productCode}>
              <td className="text-left font-sans">{p.productName}</td>
              <td>{kg(p.weekQty)}</td>
              <td>{won(p.weekAmount)}</td>
              <td>{kg(p.monthQty)}</td>
              <td>{won(p.monthAmount)}</td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );
}

function Page6({ report }: { report: WeeklyReportData }) {
  if (!report.page6) {
    return (
      <Table title="■ 업장별 매출 실적 [단위: 원]">
        <tbody>
          <tr>
            <td colSpan={7} className="py-10 text-center text-sm text-muted">
              아직 반영된 목표/실적이 없습니다. 관리자가 &quot;매출 목표 관리&quot;에서 주간업무보고 워크북을 업로드해주세요.
            </td>
          </tr>
        </tbody>
      </Table>
    );
  }

  return (
    <div className="space-y-4">
      <Table title="■ 업장별 매출 실적 [단위: 원]">
        <thead>
          <tr>
            <th className="text-left">구분</th>
            <th>주간 계획</th>
            <th>주간 실적</th>
            <th>달성률</th>
            <th>월간 계획</th>
            <th>월간 실적</th>
            <th>달성률</th>
          </tr>
        </thead>
        <tbody className="text-center">
          {report.page6.units.map((u) => (
            <tr key={u.businessUnit} className={u.businessUnit === "전체" ? "total-row" : undefined}>
              <td className="text-left font-sans">{u.businessUnit === "전체" ? "합계" : u.businessUnit}</td>
              <td>{won(u.weekPlan)}</td>
              <td>{won(u.weekActual)}</td>
              <td>{u.weekActual === null ? "-" : rate(u.weekActual, u.weekPlan)}</td>
              <td>{won(u.monthPlan)}</td>
              <td>{won(u.monthActual)}</td>
              <td>{u.monthActual === null ? "-" : rate(u.monthActual, u.monthPlan)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <TopProductsTable products={report.page6.topProducts} />
    </div>
  );
}

// 기간(월 범위) 실적 조회용 달력 버튼. 첫 번째 클릭한 달이 시작월, 두 번째 클릭한 달이
// 종료월(그 달 마지막 날까지)이 되어 바로 조회를 실행한다.
function MonthRangePicker({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (startYm: string, endYm: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const [tempStart, setTempStart] = useState<string | null>(null);

  const closeAndReset = () => {
    setOpen(false);
    setTempStart(null);
  };

  const handleMonthClick = (ym: string) => {
    if (!tempStart) {
      setTempStart(ym);
      return;
    }
    onSelect(tempStart, ym);
    closeAndReset();
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? closeAndReset() : setOpen(true))}
        className="rounded-md border border-mist px-3 py-1.5 text-sm text-muted hover:bg-mist/40 disabled:opacity-50"
      >
        📅 기간 조회
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-mist bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              className="px-2 text-sm text-muted hover:text-inktext"
            >
              ◀
            </button>
            <span className="text-sm font-medium text-inktext">{year}년</span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              className="px-2 text-sm text-muted hover:text-inktext"
            >
              ▶
            </button>
          </div>
          <p className="mb-2 text-xs text-muted">
            {tempStart ? `시작월 ${formatMonthLabel(tempStart)} 선택됨 — 종료월을 선택하세요` : "시작월을 선택하세요"}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => {
              const ym = `${year}-${String(i + 1).padStart(2, "0")}`;
              const selected = ym === tempStart;
              return (
                <button
                  key={ym}
                  type="button"
                  onClick={() => handleMonthClick(ym)}
                  className={`rounded-md px-2 py-1.5 text-xs ${
                    selected ? "bg-ink text-salt" : "text-inktext hover:bg-mist/40"
                  }`}
                >
                  {i + 1}월
                </button>
              );
            })}
          </div>
          {tempStart && (
            <button type="button" onClick={closeAndReset} className="mt-2 text-xs text-muted underline">
              취소
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RangePage1({ report }: { report: RangeActualsReport }) {
  return (
    <Table title="■ 기간 매출실적 [단위: 원]">
      <thead>
        <tr>
          <th className="text-left">구분</th>
          <th>실적</th>
        </tr>
      </thead>
      <tbody className="text-center">
        {report.page1.map((c) => (
          <tr key={c.corpCode}>
            <td className="text-left font-sans font-medium text-inktext">{c.corpName}</td>
            <td className="text-brine">{won(c.actual)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function RangePage3({ report }: { report: RangeActualsReport }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="rounded-full bg-sand/30 text-inktext px-2 py-0.5">
          염전관리팀 생산량 업로드 연동 (/saltfield-production)
        </span>
      </div>
      <Table title="■ 기간 생산실적 [단위: 20kg/포]">
        <thead>
          <tr>
            <th className="text-left">구분</th>
            <th>실적</th>
          </tr>
        </thead>
        <tbody className="text-center">
          <tr>
            <td className="text-left font-sans font-medium text-inktext">태평염전</td>
            <td>{won(report.page3.actual)}</td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
}

function RangePage4({ report }: { report: RangeActualsReport }) {
  return (
    <Table title="■ 기간 생산실적 [단위: kg]">
      <thead>
        <tr>
          <th className="text-left">구분</th>
          <th>실적</th>
        </tr>
      </thead>
      <tbody className="text-center">
        {report.page4.map((p) => (
          <tr key={p.category}>
            <td className="text-left font-sans font-medium text-inktext">{p.category}</td>
            <td className="text-brine">{kg(p.actual)}</td>
          </tr>
        ))}
        <tr className="total-row">
          <td className="text-left font-sans">합계</td>
          <td>{kg(report.page4.reduce((s, p) => s + p.actual, 0))}</td>
        </tr>
      </tbody>
    </Table>
  );
}

function RangeTopProductsTable({ products }: { products: RangeTopProduct[] }) {
  return (
    <Table title="■ 판매상품별 매출상위(기간 합계) [단위: 원]">
      <thead>
        <tr>
          <th className="text-left">상품명</th>
          <th>수량</th>
          <th>금액</th>
        </tr>
      </thead>
      <tbody className="text-center">
        {products.length === 0 ? (
          <tr>
            <td colSpan={3} className="py-6 text-sm text-muted">
              데이터가 없습니다.
            </td>
          </tr>
        ) : (
          products.map((p) => (
            <tr key={p.productCode}>
              <td className="text-left font-sans">{p.productName}</td>
              <td>{kg(p.qty)}</td>
              <td>{won(p.amount)}</td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );
}

function RangePage6({ report }: { report: RangeActualsReport }) {
  if (!report.page6) {
    return (
      <Table title="■ 업장별 매출 실적 [단위: 원]">
        <tbody>
          <tr>
            <td colSpan={2} className="py-10 text-center text-sm text-muted">
              해당 기간에 매출 데이터가 없습니다.
            </td>
          </tr>
        </tbody>
      </Table>
    );
  }

  return (
    <div className="space-y-4">
      <Table title="■ 기간 업장별 매출 실적 [단위: 원]">
        <thead>
          <tr>
            <th className="text-left">구분</th>
            <th>실적</th>
          </tr>
        </thead>
        <tbody className="text-center">
          {report.page6.units.map((u) => (
            <tr key={u.businessUnit} className={u.businessUnit === "전체" ? "total-row" : undefined}>
              <td className="text-left font-sans">{u.businessUnit === "전체" ? "합계" : u.businessUnit}</td>
              <td>{won(u.actual)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <RangeTopProductsTable products={report.page6.topProducts} />
    </div>
  );
}
