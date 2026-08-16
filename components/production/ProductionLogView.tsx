"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  deleteProductionLog,
  getProductionEfficiency,
  getProductionLogDetail,
  getProductionLogFileUrl,
  getProductionLogList,
  getProductionLogPeriods,
  getProductionTrend,
  uploadProductionLog,
  type ProductionLogDetail,
  type ProductionLogListRow,
  type ProductionTrendPoint,
} from "@/app/actions/production-logs";
import { computeProcessEfficiency } from "@/lib/production-logs/efficiency";
import { PRODUCTIVITY_2026_SNAPSHOT } from "@/lib/production-logs/productivity-2026-snapshot";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

function formatHours(n: number): string {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

// 생산효율/인당생산성 탭이 공통으로 쓰는 "기간 선택 → 데이터 재조회" 흐름을 훅으로 뺐다.
function usePeriodRangeData<T>(fetchRows: (startPeriod?: string, endPeriod?: string) => Promise<T[]>) {
  const [periods, setPeriods] = useState<string[]>([]);
  const [startPeriod, setStartPeriod] = useState<string>("");
  const [endPeriod, setEndPeriod] = useState<string>("");
  const [rows, setRows] = useState<T[] | null>(null);
  const [isLoadingPeriods, startPeriodsTransition] = useTransition();
  const [isLoadingRows, startRowsTransition] = useTransition();

  useEffect(() => {
    startPeriodsTransition(async () => {
      const list = await getProductionLogPeriods();
      setPeriods(list);
      if (list.length > 0) {
        setStartPeriod(list[0]);
        setEndPeriod(list[list.length - 1]);
      }
    });
     
  }, []);

  useEffect(() => {
    if (!startPeriod || !endPeriod) return;
    const startIdx = periods.indexOf(startPeriod);
    const endIdx = periods.indexOf(endPeriod);
    const [from, to] = startIdx <= endIdx ? [startPeriod, endPeriod] : [endPeriod, startPeriod];
    startRowsTransition(async () => {
      setRows(await fetchRows(from, to));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPeriod, endPeriod]);

  return {
    periods,
    startPeriod,
    endPeriod,
    setStartPeriod,
    setEndPeriod,
    rows,
    isLoadingPeriods,
    isLoadingRows,
  };
}

function PeriodRangePicker({
  periods,
  startPeriod,
  endPeriod,
  onChangeStart,
  onChangeEnd,
}: {
  periods: string[];
  startPeriod: string;
  endPeriod: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-muted">기간</label>
      <select
        value={startPeriod}
        onChange={(e) => onChangeStart(e.target.value)}
        className="rounded-md border border-mist px-3 py-1.5 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
      >
        {periods.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <span className="text-sm text-muted">~</span>
      <select
        value={endPeriod}
        onChange={(e) => onChangeEnd(e.target.value)}
        className="rounded-md border border-mist px-3 py-1.5 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
      >
        {periods.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-mist bg-white p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-inktext">{value}</p>
    </div>
  );
}

function formatMaybeHours(n: number | null): string {
  return n === null ? "-" : formatHours(n);
}

// 업무보고 파일(주간_월간_업무보고_2026.08.09.xlsx)의 "인당생산성" 시트 26년 블록을
// 한 번 그대로 옮겨온 임시 스냅샷 표. 자동 갱신되지 않으며, 화면 구조는 추후 다시 설계 예정.
function Productivity2026SnapshotTable() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-inktext">2026년 인당생산성 (참고자료 스냅샷)</h3>
        <span className="rounded-full bg-mist px-2 py-0.5 text-xs text-muted">수동 입력 · 자동 갱신 안 됨</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-mist bg-white">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-xs">
            <thead>
              <tr className="border-b border-mist bg-mist/40 text-left text-muted">
                <th className="px-3 py-2 font-medium">구분</th>
                <th className="px-3 py-2 text-right font-medium">천일염(kg)</th>
                <th className="px-3 py-2 text-right font-medium">가공염(kg)</th>
                <th className="px-3 py-2 text-right font-medium">계(kg)</th>
                <th className="px-3 py-2 text-right font-medium">생산인원</th>
                <th className="px-3 py-2 text-right font-medium">근무일수</th>
                <th className="px-3 py-2 text-right font-medium">정기근로시간</th>
                <th className="px-3 py-2 text-right font-medium">인당월생산량</th>
                <th className="px-3 py-2 text-right font-medium">인당일생산량</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {PRODUCTIVITY_2026_SNAPSHOT.map((r) => (
                <tr key={r.month} className={r.month === "계" || r.month === "평균" ? "bg-salt font-medium" : ""}>
                  <td className="px-3 py-2 font-medium text-inktext">{r.month}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMaybeHours(r.cheonilYeom)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMaybeHours(r.gagongYeom)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMaybeHours(r.total)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMaybeHours(r.workers)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMaybeHours(r.workDays)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMaybeHours(r.regularHours)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMaybeHours(r.perMonth)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMaybeHours(r.perDay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted/70">
        ※ 2026.08.09자 업무보고 파일의 인당생산성(26년) 표를 그대로 옮긴 임시 스냅샷입니다. 이후 화면 구조는 다시 설계할 예정입니다.
      </p>
    </div>
  );
}

// 공정별 가동률(막대바+%) + 정지시간 구성 — 선택한 기간 범위를 누적 집계한 표.
function EfficiencyView() {
  const { periods, startPeriod, endPeriod, setStartPeriod, setEndPeriod, rows, isLoadingPeriods, isLoadingRows } =
    usePeriodRangeData(getProductionEfficiency);

  if (isLoadingPeriods && periods.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
        <p className="text-sm text-muted">불러오는 중…</p>
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
        <p className="text-sm text-muted">업로드된 생산일지가 없습니다. 아래에서 먼저 업로드해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PeriodRangePicker
        periods={periods}
        startPeriod={startPeriod}
        endPeriod={endPeriod}
        onChangeStart={setStartPeriod}
        onChangeEnd={setEndPeriod}
      />

      {isLoadingRows && rows === null ? (
        <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
          <p className="text-sm text-muted">불러오는 중…</p>
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
          <p className="text-sm text-muted">
            선택한 기간에는 가동률을 계산할 수 있는 생산일지가 없습니다. (&quot;총근무시간&quot;·&quot;실근무시간&quot; 컬럼이 있는 탭이 필요합니다)
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-mist bg-white">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-xs">
              <thead>
                <tr className="border-b border-mist bg-mist/40 text-left text-muted">
                  <th className="px-3 py-2 font-medium">공정</th>
                  <th className="px-3 py-2 text-right font-medium">총근무시간</th>
                  <th className="px-3 py-2 text-right font-medium">실근무시간</th>
                  <th className="px-3 py-2 font-medium">가동률</th>
                  <th className="px-3 py-2 text-right font-medium">준비</th>
                  <th className="px-3 py-2 text-right font-medium">휴게</th>
                  <th className="px-3 py-2 text-right font-medium">청소</th>
                  <th className="px-3 py-2 text-right font-medium">고장</th>
                  <th className="px-3 py-2 text-right font-medium">기타</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {rows.map((r) => (
                  <tr key={r.processName}>
                    <td className="px-3 py-2 font-medium text-inktext">{r.processName}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatHours(r.totalHours)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatHours(r.actualHours)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-mist">
                          <div
                            className="h-full rounded-full bg-brine"
                            style={{ width: `${Math.min(100, r.utilizationPct)}%` }}
                          />
                        </div>
                        <span className="font-mono text-inktext">{r.utilizationPct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted">{formatHours(r.prepHours)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted">{formatHours(r.restHours)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted">{formatHours(r.cleanHours)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted">{formatHours(r.breakdownHours)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted">{formatHours(r.etcHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// 기간(월)별로 생산 흐름이 어떻게 이어져왔는지 — 오래된 기간부터 순서대로 보여주는 시계열.
function TrendView() {
  const { periods, startPeriod, endPeriod, setStartPeriod, setEndPeriod, rows, isLoadingPeriods, isLoadingRows } =
    usePeriodRangeData(getProductionTrend);

  const maxProductivity = useMemo(
    () => (rows ? Math.max(0, ...rows.map((r) => r.productivityPerWorker)) : 0),
    [rows],
  );

  if (isLoadingPeriods && periods.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
        <p className="text-sm text-muted">불러오는 중…</p>
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
        <p className="text-sm text-muted">업로드된 생산일지가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PeriodRangePicker
        periods={periods}
        startPeriod={startPeriod}
        endPeriod={endPeriod}
        onChangeStart={setStartPeriod}
        onChangeEnd={setEndPeriod}
      />

      {isLoadingRows && rows === null ? (
        <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
          <p className="text-sm text-muted">불러오는 중…</p>
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
          <p className="text-sm text-muted">
            선택한 기간에는 흐름을 계산할 수 있는 생산일지가 없습니다. (&quot;총근무시간&quot;·&quot;실근무시간&quot; 컬럼이 있는 탭이 필요합니다)
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-mist bg-white">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-xs">
              <thead>
                <tr className="border-b border-mist bg-mist/40 text-left text-muted">
                  <th className="px-3 py-2 font-medium">기간</th>
                  <th className="px-3 py-2 text-right font-medium">총근무시간</th>
                  <th className="px-3 py-2 text-right font-medium">실근무시간</th>
                  <th className="px-3 py-2 font-medium">가동률</th>
                  <th className="px-3 py-2 text-right font-medium">투입인원(연인원)</th>
                  <th className="px-3 py-2 text-right font-medium">투입량 합계</th>
                  <th className="px-3 py-2 font-medium">인당 투입량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {rows.map((r: ProductionTrendPoint) => (
                  <tr key={r.periodLabel}>
                    <td className="px-3 py-2 font-medium text-inktext">{r.periodLabel}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatHours(r.totalHours)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatHours(r.actualHours)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-mist">
                          <div
                            className="h-full rounded-full bg-brine"
                            style={{ width: `${Math.min(100, r.utilizationPct)}%` }}
                          />
                        </div>
                        <span className="font-mono text-inktext">{r.utilizationPct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{formatHours(r.totalWorkers)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatHours(r.totalInputQty)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-mist">
                          <div
                            className="h-full rounded-full bg-crimson"
                            style={{
                              width: `${maxProductivity > 0 ? (r.productivityPerWorker / maxProductivity) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono font-medium text-inktext">
                          {formatHours(r.productivityPerWorker)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-xs text-muted/70">
        ※ 왼쪽부터 오래된 기간 순입니다. 막대는 인당 투입량을 선택한 기간 범위 내 최댓값 대비 상대 크기로 표시합니다.
        투입량/인당 투입량은 생산일지의 &quot;투입량&quot;·&quot;투입인원&quot; 컬럼 기준 근사치입니다.
      </p>

      <Productivity2026SnapshotTable />
    </div>
  );
}

// 생산일지 업로드/목록/원본 조회 + 선택한 파일의 요약(가동률·정지시간)과 원본 표.
// (기존 "생산일지 조회" 탭을 생산효율 탭 안으로 통합한 부분)
function ProductionLogBrowser({ currentUserId, isAdmin }: { currentUserId: string; isAdmin: boolean }) {
  const [list, setList] = useState<ProductionLogListRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductionLogDetail | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingList, startListTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isLoadingDetail, startDetailTransition] = useTransition();
  const [openingFile, setOpeningFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refreshList(selectAfter?: string) {
    startListTransition(async () => {
      const rows = await getProductionLogList();
      setList(rows);
      setSelectedId((prev) => selectAfter ?? prev ?? rows[0]?.id ?? null);
    });
  }

  useEffect(() => {
    refreshList();
     
  }, []);

  useEffect(() => {
    startDetailTransition(async () => {
      setActiveSheet(0);
      if (!selectedId) {
        setDetail(null);
        return;
      }
      const d = await getProductionLogDetail(selectedId);
      setDetail(d);
    });
     
  }, [selectedId]);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    startUploadTransition(async () => {
      const result = await uploadProductionLog(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      refreshList(result.id);
    });
  }

  function handleDelete() {
    if (!selectedId) return;
    if (!window.confirm("이 생산일지를 삭제할까요?")) return;
    startDeleteTransition(async () => {
      const result = await deleteProductionLog(selectedId);
      if (!result.ok) {
        window.alert(result.message);
        return;
      }
      setSelectedId(null);
      setDetail(null);
      refreshList();
    });
  }

  async function handleOpenFile() {
    if (!detail) return;
    setOpeningFile(true);
    const url = await getProductionLogFileUrl(detail.file_path);
    setOpeningFile(false);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  const canDelete = detail ? isAdmin || list.find((r) => r.id === detail.id)?.uploaded_by === currentUserId : false;
  const sheet = detail?.sheets[activeSheet] ?? null;

  // 선택한 파일 하나만의 요약 — 어떤 기간 범위를 고르든 상관없이 지금 보고 있는 파일
  // 기준으로 "한눈에" 들어오는 숫자를 보여준다.
  const fileSummary = useMemo(() => {
    if (!detail) return null;
    const byProcess = computeProcessEfficiency([detail.sheets]);
    if (byProcess.length === 0) return null;
    const totalHours = byProcess.reduce((s, p) => s + p.totalHours, 0);
    const actualHours = byProcess.reduce((s, p) => s + p.actualHours, 0);
    const stopHours = byProcess.reduce((s, p) => s + p.stopHours, 0);
    const totalInputQty = byProcess.reduce((s, p) => s + p.totalInputQty, 0);
    const totalWorkers = byProcess.reduce((s, p) => s + p.totalWorkers, 0);
    return {
      processCount: byProcess.length,
      utilizationPct: totalHours > 0 ? (actualHours / totalHours) * 100 : 0,
      stopHours,
      productivityPerWorker: totalWorkers > 0 ? totalInputQty / totalWorkers : 0,
    };
  }, [detail]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <div className="h-fit overflow-hidden rounded-lg border border-mist bg-white">
        <div className="space-y-2 border-b border-mist px-4 py-3.5">
          <label className="block text-xs font-medium text-muted">업로드</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleUpload}
            disabled={isUploading}
            className="w-full rounded-md border border-mist px-3 py-2 text-sm text-muted outline-none file:mr-3 file:rounded-md file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-inktext disabled:opacity-50"
          />
          <p className="text-xs text-muted/70">엑셀(.xlsx)을 올리면 안에 있는 공정별 탭이 오른쪽에 그대로 나타납니다.</p>
          {isUploading && <p className="text-xs text-muted">업로드 중…</p>}
          {error && <p className="text-xs text-crimsond">{error}</p>}
        </div>
        <div className="px-4 py-3 text-sm font-semibold text-inktext">생산일지 목록</div>
        <ul className="divide-y divide-mist text-sm">
          {list.map((row) => (
            <li
              key={row.id}
              onClick={() => setSelectedId(row.id)}
              className={`cursor-pointer px-4 py-3 transition-colors hover:bg-mist/40 ${
                row.id === selectedId ? "border-l-2 border-crimson bg-crimson/5" : ""
              }`}
            >
              <p className="font-medium text-inktext">{row.period_label}</p>
              <p className="mt-0.5 truncate text-xs text-muted">{row.file_name}</p>
              <p className="mt-0.5 text-xs text-muted/70">
                {row.uploaded_by_name ?? "알 수 없음"} · {formatDateTime(row.created_at)} 업로드
              </p>
            </li>
          ))}
          {!isLoadingList && list.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-muted">등록된 생산일지가 없습니다.</li>
          )}
        </ul>
      </div>

      <div className="space-y-3">
        {!detail ? (
          <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
            <p className="text-sm text-muted">
              {isLoadingDetail ? "불러오는 중…" : "왼쪽에서 생산일지 엑셀을 업로드해주세요."}
            </p>
          </div>
        ) : (
          <>
            {fileSummary && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="참여 공정" value={`${fileSummary.processCount}개`} />
                <StatCard label="가동률" value={`${fileSummary.utilizationPct.toFixed(1)}%`} />
                <StatCard label="총 정지시간" value={`${formatHours(fileSummary.stopHours)}h`} />
                <StatCard label="인당 투입량" value={formatHours(fileSummary.productivityPerWorker)} />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1 rounded-lg border border-mist bg-white p-1 text-xs">
                {detail.sheets.map((s, i) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setActiveSheet(i)}
                    className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                      i === activeSheet ? "bg-ink text-salt" : "text-muted hover:bg-mist"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenFile}
                  disabled={openingFile}
                  className="rounded-md border border-mist px-3 py-1.5 text-xs font-medium text-inktext transition-colors hover:bg-mist disabled:opacity-50"
                >
                  원본 파일 열기
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="rounded-md border border-mist px-3 py-1.5 text-xs font-medium text-crimsond transition-colors hover:bg-crimson/5 disabled:opacity-50"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-mist bg-white">
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-xs">
                  <thead>
                    <tr className="border-b border-mist bg-mist/40 text-left text-muted">
                      {(sheet?.headers ?? []).map((h) => (
                        <th key={h} className="px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist">
                    {(sheet?.rows ?? []).map((row, i) => (
                      <tr key={i}>
                        {(sheet?.headers ?? []).map((h) => (
                          <td key={h} className="px-3 py-2">
                            {row[h] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {sheet && sheet.rows.length === 0 && (
                      <tr>
                        <td colSpan={Math.max(sheet.headers.length, 1)} className="px-3 py-6 text-center text-muted">
                          이 탭에는 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-muted/70">
              ※ 표는 원본 엑셀의 헤더(3번째 행)를 그대로 컬럼으로 사용하며, 탭마다 컬럼 구성이 다릅니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function ProductionLogView({ currentUserId, isAdmin }: { currentUserId: string; isAdmin: boolean }) {
  const [mode, setMode] = useState<"efficiency" | "productivity">("efficiency");

  return (
    <div className="space-y-4">
      <div className="inline-flex gap-1 rounded-lg border border-mist bg-white p-1">
        <button
          type="button"
          onClick={() => setMode("efficiency")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "efficiency" ? "bg-ink text-salt" : "text-muted"
          }`}
        >
          생산효율
        </button>
        <button
          type="button"
          onClick={() => setMode("productivity")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "productivity" ? "bg-ink text-salt" : "text-muted"
          }`}
        >
          인당생산성
        </button>
      </div>

      {mode === "productivity" ? (
        <TrendView />
      ) : (
        <div className="space-y-6">
          <EfficiencyView />
          <div>
            <h2 className="mb-3 text-sm font-semibold text-inktext">생산일지 목록 및 상세</h2>
            <ProductionLogBrowser currentUserId={currentUserId} isAdmin={isAdmin} />
          </div>
        </div>
      )}
    </div>
  );
}
