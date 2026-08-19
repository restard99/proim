import type { ProductionRecordDetail as ProductionRecordDetailType } from "@/app/actions/saltfield-production";

function formatNum(n: number | null | undefined) {
  return n === null || n === undefined ? "-" : n.toLocaleString("ko-KR");
}

function formatPercent(n: number | null | undefined) {
  return n === null || n === undefined ? "-" : `${(n * 100).toFixed(1)}%`;
}

function groupByGu(fieldData: Record<string, number>) {
  const groups = new Map<string, { label: string; value: number }[]>();
  for (const [label, value] of Object.entries(fieldData)) {
    const gu = label.split("-")[0] ?? "기타";
    if (!groups.has(gu)) groups.set(gu, []);
    groups.get(gu)!.push({ label, value });
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function ProductionRecordDetail({ detail }: { detail: ProductionRecordDetailType }) {
  const groups = groupByGu(detail.field_data);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">일일실적</p>
          <p className="mt-1 text-xl font-semibold">{formatNum(detail.daily_total)} 포</p>
        </div>
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">주간실적 / 계획</p>
          <p className="mt-1 text-xl font-semibold">
            {formatNum(detail.weekly_actual)} / {formatNum(detail.weekly_plan)}
          </p>
        </div>
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">월간실적 / 계획</p>
          <p className="mt-1 text-xl font-semibold">
            {formatNum(detail.monthly_actual)} / {formatNum(detail.monthly_plan)}
          </p>
          <p className="mt-0.5 text-xs text-brine">{formatPercent(detail.monthly_achievement_rate)}</p>
        </div>
        <div className="rounded-lg border border-mist bg-white p-4">
          <p className="text-xs text-muted">연간실적 / 계획</p>
          <p className="mt-1 text-xl font-semibold">
            {formatNum(detail.annual_actual)} / {formatNum(detail.annual_plan)}
          </p>
          <p className="mt-0.5 text-xs text-brine">{formatPercent(detail.annual_progress_rate)}</p>
        </div>
      </div>

      {groups.map(([gu, fields]) => (
        <div key={gu} className="rounded-lg border border-mist bg-white overflow-hidden">
          <div className="border-b border-mist bg-mist/40 px-4 py-2.5 text-xs font-semibold text-muted">
            {gu}공구 (호수별 생산량, 포)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-mist">
                  {fields.map((f) => (
                    <th key={f.label} className="px-3 py-2 text-left">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="text-left font-mono">
                  {fields.map((f) => (
                    <td key={f.label} className={`px-3 py-2 ${f.value > 0 ? "text-inktext font-semibold" : ""}`}>
                      {f.value}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
