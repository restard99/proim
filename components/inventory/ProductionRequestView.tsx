"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  deleteProductionRequest,
  getProductionRequestDetail,
  getProductionRequestFileUrl,
  getProductionRequestList,
  uploadProductionRequest,
  type ProductionRequestDetail,
  type ProductionRequestListRow,
} from "@/app/actions/production-requests";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ProductionRequestView({ canUpload }: { canUpload: boolean }) {
  const [list, setList] = useState<ProductionRequestListRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductionRequestDetail | null>(null);
  const [requestDate, setRequestDate] = useState(todayISO);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingList, startListTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isLoadingDetail, startDetailTransition] = useTransition();
  const [openingFile, setOpeningFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refreshList(selectAfter?: string) {
    startListTransition(async () => {
      const rows = await getProductionRequestList();
      setList(rows);
      setSelectedId((prev) => selectAfter ?? prev ?? rows[0]?.id ?? null);
    });
  }

  useEffect(() => {
    refreshList();
  }, []);

  useEffect(() => {
    startDetailTransition(async () => {
      if (!selectedId) {
        setDetail(null);
        return;
      }
      const d = await getProductionRequestDetail(selectedId);
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
      const result = await uploadProductionRequest(requestDate, formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      refreshList(result.id);
    });
  }

  function handleDelete() {
    if (!selectedId) return;
    if (!window.confirm("이 생산의뢰서를 삭제할까요?")) return;
    startDeleteTransition(async () => {
      const result = await deleteProductionRequest(selectedId);
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
    const url = await getProductionRequestFileUrl(detail.file_path);
    setOpeningFile(false);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <div className="h-fit overflow-hidden rounded-lg border border-mist bg-white">
        {canUpload && (
          <div className="space-y-2 border-b border-mist px-4 py-3.5">
            <label className="block text-xs font-medium text-muted">의뢰일자</label>
            <input
              type="date"
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
              className="w-full rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-brine focus:ring-2 focus:ring-brine/30"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleUpload}
              disabled={isUploading}
              className="w-full rounded-md border border-mist px-3 py-2 text-sm text-muted outline-none file:mr-3 file:rounded-md file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-inktext disabled:opacity-50"
            />
            {isUploading && <p className="text-xs text-muted">업로드 및 분석 중…</p>}
            {error && <p className="text-xs text-crimsond">{error}</p>}
          </div>
        )}
        <div className="px-4 py-3 text-sm font-semibold text-inktext">생산의뢰서 목록</div>
        <ul className="divide-y divide-mist">
          {list.map((r) => (
            <li
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`cursor-pointer px-4 py-3 transition-colors hover:bg-mist/40 ${
                r.id === selectedId ? "border-l-2 border-crimson bg-crimson/5" : ""
              }`}
            >
              <p className="text-sm font-medium text-inktext">{r.request_date}</p>
              <p className="mt-0.5 truncate text-xs text-muted">{r.file_name}</p>
              {r.uploaded_by_name && <p className="mt-0.5 text-xs text-muted">{r.uploaded_by_name}</p>}
            </li>
          ))}
          {!isLoadingList && list.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-muted">등록된 생산의뢰서가 없습니다.</li>
          )}
        </ul>
      </div>

      <div className="space-y-4">
        {!detail && !isLoadingDetail && (
          <div className="rounded-lg border border-mist bg-white px-6 py-16 text-center text-sm text-muted">
            왼쪽 목록에서 생산의뢰서를 선택하세요.
          </div>
        )}
        {detail && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-mist bg-white px-4 py-3.5">
              <div>
                <p className="text-sm font-semibold text-inktext">{detail.request_date} 생산의뢰서</p>
                <p className="mt-0.5 text-xs text-muted">{detail.file_name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenFile}
                  disabled={openingFile}
                  className="rounded-md border border-mist px-3 py-1.5 text-xs font-medium text-inktext hover:bg-mist/50 disabled:opacity-50"
                >
                  원본 파일 열기
                </button>
                {canUpload && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="rounded-md border border-mist px-3 py-1.5 text-xs font-medium text-crimsond hover:bg-crimson/5 disabled:opacity-50"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-mist bg-white">
              <div className="border-b border-mist px-4 py-3.5 text-sm font-semibold text-inktext">
                제품별 생산의뢰 내역
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b border-mist bg-mist/40 text-left text-xs text-muted">
                      <th className="px-3 py-2.5 font-medium">제품명</th>
                      <th className="px-3 py-2.5 text-right font-medium">낱개수</th>
                      <th className="px-3 py-2.5 text-right font-medium">입수</th>
                      <th className="px-3 py-2.5 text-right font-medium">박스수</th>
                      <th className="px-3 py-2.5 text-right font-medium">중량(kg)</th>
                      <th className="px-3 py-2.5 text-right font-medium">PL</th>
                      <th className="px-3 py-2.5 text-right font-medium">EA/PL</th>
                      <th className="px-3 py-2.5 font-medium">특이사항</th>
                      <th className="px-3 py-2.5 font-medium">적재방식</th>
                      <th className="px-3 py-2.5 font-medium">완료요청일</th>
                      <th className="px-3 py-2.5 font-medium">비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist">
                    {detail.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2.5 font-medium text-inktext">{item.name}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{item.count}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{item.pack}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{item.boxes}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{item.weightKg}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{item.pl}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{item.eaPerPl}</td>
                        <td className="px-3 py-2.5 text-muted">{item.note}</td>
                        <td className="px-3 py-2.5 text-muted">{item.loadType}</td>
                        <td className="px-3 py-2.5 text-muted">{item.dueDate}</td>
                        <td className="px-3 py-2.5 text-muted">{item.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                  {detail.totals && (
                    <tfoot>
                      <tr className="border-t border-mist bg-mist/40 font-semibold text-inktext">
                        <td className="px-3 py-2.5">소계</td>
                        <td className="px-3 py-2.5 text-right font-mono">{detail.totals.count}</td>
                        <td className="px-3 py-2.5" />
                        <td className="px-3 py-2.5" />
                        <td className="px-3 py-2.5 text-right font-mono">{detail.totals.weightKg}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{detail.totals.pl}</td>
                        <td colSpan={5} className="px-3 py-2.5" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {detail.sub_items.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-mist bg-white">
                <div className="border-b border-mist px-4 py-3.5 text-sm font-semibold text-inktext">
                  반제품 의뢰량
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px] text-sm">
                    <thead>
                      <tr className="border-b border-mist bg-mist/40 text-left text-xs text-muted">
                        <th className="px-3 py-2.5 font-medium">반제품명</th>
                        <th className="px-3 py-2.5 text-right font-medium">의뢰량(kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mist">
                      {detail.sub_items.map((s, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2.5 text-inktext">{s.name}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{s.amountKg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
