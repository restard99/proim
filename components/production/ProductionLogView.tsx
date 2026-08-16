"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  deleteProductionLog,
  getProductionLogDetail,
  getProductionLogFileUrl,
  getProductionLogList,
  uploadProductionLog,
  type ProductionLogDetail,
  type ProductionLogListRow,
} from "@/app/actions/production-logs";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export function ProductionLogView({ currentUserId, isAdmin }: { currentUserId: string; isAdmin: boolean }) {
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
