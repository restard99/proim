"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  deleteProductionMaterialInventory,
  getProductionMaterialInventoryDetail,
  getProductionMaterialInventoryFileUrl,
  getProductionMaterialInventoryList,
  uploadProductionMaterialInventory,
  type ProductionMaterialInventoryDetail,
  type ProductionMaterialInventoryListRow,
} from "@/app/actions/production-material-inventory";
import type { MaterialInventoryRow, MaterialInventorySection } from "@/lib/production-material-inventory/parse";

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${days[d.getDay()]})`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatNum(n: number | null): string {
  if (n === null) return "-";
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function formatPct(n: number | null): string {
  if (n === null) return "-";
  return `${(n * 100).toFixed(1)}%`;
}

const TABS: { key: "raw" | "semi"; label: string }[] = [
  { key: "raw", label: "원재료·부재료" },
  { key: "semi", label: "반제품" },
];

// 생산의뢰서 화면과 같은 격자형 톤(헤더 강조 + 열 구분선 + 가운데 정렬 + 숫자 font-mono)을
// 맞춰 가독성을 높였다. 현재고는 실무에서 가장 자주 확인하는 값이라 데이터 행에서도 굵게 강조한다.
const HEADER_CELL_CLASS = "whitespace-nowrap border-l border-mist px-3 py-2 font-medium first:border-l-0";
const BODY_CELL_CLASS = "whitespace-nowrap border-l border-mist px-3 py-2 text-center align-middle first:border-l-0";
const REMARK_CELL_CLASS =
  "w-[220px] max-w-[220px] whitespace-pre-wrap break-words border-l border-mist px-3 py-2 text-center align-middle leading-snug";

function InventoryTable({ section }: { section: MaterialInventorySection }) {
  return (
    <div className="overflow-hidden rounded-lg border border-mist bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1300px] text-sm">
          <thead>
            <tr className="border-b border-mist bg-mist/40 text-center text-xs text-muted">
              <th className={HEADER_CELL_CLASS}>SEQ</th>
              <th className={HEADER_CELL_CLASS}>제품명</th>
              <th className={HEADER_CELL_CLASS}>재고단위</th>
              <th className={HEADER_CELL_CLASS}>기초재고</th>
              <th className={HEADER_CELL_CLASS}>단위</th>
              <th className={HEADER_CELL_CLASS}>입고(전표)</th>
              <th className={HEADER_CELL_CLASS}>입고(실입고)</th>
              <th className={HEADER_CELL_CLASS}>출고(전표)</th>
              <th className={HEADER_CELL_CLASS}>출고(실투입)</th>
              <th className={HEADER_CELL_CLASS}>자연수율</th>
              <th className={HEADER_CELL_CLASS}>현재고</th>
              <th className={HEADER_CELL_CLASS}>입고누계</th>
              <th className={HEADER_CELL_CLASS}>출고누계</th>
              <th className={`${HEADER_CELL_CLASS} w-[220px]`}>비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {section.rows.map((r: MaterialInventoryRow, i: number) => (
              <tr key={`${r.seq}-${i}`} className="text-inktext">
                <td className={`${BODY_CELL_CLASS} text-muted`}>{r.seq}</td>
                <td className={`${BODY_CELL_CLASS} font-medium`}>{r.name}</td>
                <td className={BODY_CELL_CLASS}>{r.stockUnit || "-"}</td>
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(r.beginQty)}</td>
                <td className={BODY_CELL_CLASS}>{r.weightUnit || "-"}</td>
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(r.inSlipQty)}</td>
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(r.inActualQty)}</td>
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(r.outSlipQty)}</td>
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(r.outActualQty)}</td>
                <td className={`${BODY_CELL_CLASS} font-mono text-muted`}>{formatPct(r.yieldRate)}</td>
                <td className={`${BODY_CELL_CLASS} font-mono font-semibold`}>{formatNum(r.currentQty)}</td>
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(r.inCumQty)}</td>
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(r.outCumQty)}</td>
                <td className={`${REMARK_CELL_CLASS} text-muted`}>{r.remark || "-"}</td>
              </tr>
            ))}
            {section.rows.length === 0 && (
              <tr>
                <td colSpan={14} className="px-3 py-6 text-center text-muted">
                  항목이 없습니다.
                </td>
              </tr>
            )}
            {section.totals && (
              <tr className="border-t border-mist bg-mist/40 text-center font-semibold text-inktext">
                <td className={BODY_CELL_CLASS} colSpan={3}>
                  합계
                </td>
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(section.totals.beginQty)}</td>
                <td className={BODY_CELL_CLASS} />
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(section.totals.inSlipQty)}</td>
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(section.totals.inActualQty)}</td>
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(section.totals.outSlipQty)}</td>
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(section.totals.outActualQty)}</td>
                <td className={BODY_CELL_CLASS} />
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(section.totals.currentQty)}</td>
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(section.totals.inCumQty)}</td>
                <td className={`${BODY_CELL_CLASS} font-mono`}>{formatNum(section.totals.outCumQty)}</td>
                <td className={BODY_CELL_CLASS} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProductionMaterialInventoryView({ currentUserId, isAdmin }: { currentUserId: string; isAdmin: boolean }) {
  const [list, setList] = useState<ProductionMaterialInventoryListRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductionMaterialInventoryDetail | null>(null);
  const [tab, setTab] = useState<"raw" | "semi">("raw");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingList, startListTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isLoadingDetail, startDetailTransition] = useTransition();
  const [openingFile, setOpeningFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refreshList(selectAfter?: string) {
    startListTransition(async () => {
      const rows = await getProductionMaterialInventoryList();
      setList(rows);
      setSelectedId((prev) => selectAfter ?? prev ?? rows[0]?.id ?? null);
    });
  }

  useEffect(() => {
    refreshList();

  }, []);

  useEffect(() => {
    startDetailTransition(async () => {
      setTab("raw");
      if (!selectedId) {
        setDetail(null);
        return;
      }
      setDetail(await getProductionMaterialInventoryDetail(selectedId));
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
      const result = await uploadProductionMaterialInventory(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      refreshList(result.id);
    });
  }

  function handleDelete() {
    if (!selectedId) return;
    if (!window.confirm("이 업로드 이력을 삭제할까요?")) return;
    startDeleteTransition(async () => {
      const result = await deleteProductionMaterialInventory(selectedId);
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
    const url = await getProductionMaterialInventoryFileUrl(detail.file_path);
    setOpeningFile(false);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  const canDelete = detail
    ? isAdmin || list.find((r) => r.id === detail.id)?.uploaded_by === currentUserId
    : false;
  const section = detail ? (tab === "raw" ? detail.raw_materials : detail.semi_finished) : null;

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
          <p className="text-xs text-muted/70">
            엑셀(.xlsx)을 올리면 안의 원재료·부재료/반제품 표를 그대로 조회할 수 있습니다.
          </p>
          {isUploading && <p className="text-xs text-muted">업로드 중…</p>}
          {error && <p className="text-xs text-crimsond">{error}</p>}
        </div>
        <div className="px-4 py-3 text-sm font-semibold text-inktext">업로드 이력</div>
        <ul className="divide-y divide-mist text-sm">
          {list.map((row) => (
            <li
              key={row.id}
              onClick={() => setSelectedId(row.id)}
              className={`cursor-pointer px-4 py-3 transition-colors hover:bg-mist/40 ${
                row.id === selectedId ? "border-l-2 border-crimson bg-crimson/5" : ""
              }`}
            >
              <p className="font-medium text-inktext">{formatDate(row.snapshot_date)}</p>
              <p className="mt-0.5 truncate text-xs text-muted">{row.file_name}</p>
              <p className="mt-0.5 text-xs text-muted/70">
                {row.uploaded_by_name ?? "알 수 없음"} · {formatDateTime(row.created_at)} 업로드
              </p>
            </li>
          ))}
          {!isLoadingList && list.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-muted">등록된 이력이 없습니다.</li>
          )}
        </ul>
      </div>

      <div className="space-y-3">
        {!detail ? (
          <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
            <p className="text-sm text-muted">
              {isLoadingDetail ? "불러오는 중…" : "왼쪽에서 원재료·반제품 현황 엑셀을 업로드해주세요."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1 rounded-lg border border-mist bg-white p-1 text-xs">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                      tab === t.key ? "bg-ink text-salt" : "text-muted hover:bg-mist"
                    }`}
                  >
                    {t.label} (
                    {t.key === "raw" ? detail.raw_materials.rows.length : detail.semi_finished.rows.length})
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

            {section && <InventoryTable section={section} />}
            <p className="text-xs text-muted/70">
              ※ 기준일 {formatDate(detail.snapshot_date)} · 원본 엑셀의 값을 그대로 표시합니다. 자연수율이 0으로 나눠
              계산 불가한 경우 &quot;-&quot;로 표시됩니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
