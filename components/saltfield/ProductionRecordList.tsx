import Link from "next/link";
import { ProductionUploadButton } from "./ProductionUploadButton";
import type { ProductionRecordListRow, ProductionSummary } from "@/app/actions/saltfield-production";

function formatNum(n: number | null | undefined) {
  return n === null || n === undefined ? "-" : n.toLocaleString("ko-KR");
}

function formatPercent(n: number | null | undefined) {
  return n === null || n === undefined ? "-" : `${(n * 100).toFixed(1)}%`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${iso} (${days[d.getUTCDay()]})`;
}

export function ProductionRecordList({
  records,
  summary,
}: {
  records: ProductionRecordListRow[];
  summary: ProductionSummary;
}) {
  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-inktext">생산량 업로드 기록</h2>
          <p className="mt-1 text-sm text-muted">주간업무보고 엑셀(생산실적 포함)을 올리면 날짜별 생산량이 쌓입니다.</p>
        </div>
        <ProductionUploadButton />
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">최근 일일 생산량</p>
          <p className="mt-1 text-xl font-semibold text-inktext">
            {formatNum(summary.todayTotal)}
            <span className="text-sm font-normal text-muted ml-1">포</span>
          </p>
        </div>
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">이번 주 실적 / 계획</p>
          <p className="mt-1 text-xl font-semibold text-inktext">
            {formatNum(summary.weeklyActual)}
            <span className="text-sm font-normal text-muted"> / {formatNum(summary.weeklyPlan)}</span>
          </p>
        </div>
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">이번 달 달성율</p>
          <p className="mt-1 text-xl font-semibold text-brine">{formatPercent(summary.monthlyAchievementRate)}</p>
        </div>
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">연간 진행율</p>
          <p className="mt-1 text-xl font-semibold text-brine">{formatPercent(summary.annualProgressRate)}</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-mist flex items-center justify-center">
            <svg className="h-6 w-6 text-muted" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.414a1 1 0 0 0-.293-.707l-4.414-4.414A1 1 0 0 0 11.586 3H4Zm6 6a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1H8a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1Z" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-inktext">업로드된 생산량 기록이 없습니다</p>
          <p className="mt-1 text-sm text-muted">주간업무보고 엑셀을 업로드하면 여기에 날짜별로 표시됩니다.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-mist bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mist bg-mist/40 text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium text-left">일자</th>
                <th className="px-4 py-3 font-medium text-left">일일실적(포)</th>
                <th className="px-4 py-3 font-medium text-left">등록 파일</th>
                <th className="px-4 py-3 font-medium text-left">업로드한 사람</th>
                <th className="px-4 py-3 font-medium text-left">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {records.map((r) => (
                <tr key={r.record_date} className="hover:bg-mist/20">
                  <td className="px-4 py-3.5 font-medium">{formatDate(r.record_date)}</td>
                  <td className="px-4 py-3.5 text-left font-mono">{formatNum(r.daily_total)}</td>
                  <td className="px-4 py-3.5 text-muted text-xs">{r.file_name}</td>
                  <td className="px-4 py-3.5 text-muted">{r.uploaded_by_name ?? "-"}</td>
                  <td className="px-4 py-3.5 text-left">
                    <Link href={`/saltfield-production/${r.record_date}`} className="text-xs text-brine">
                      상세 보기 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
