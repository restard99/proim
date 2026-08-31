"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadTargets, type TargetUploadHistoryRow } from "@/app/actions/executive-targets";
import { uploadPlConfirmed, type PlConfirmedUploadHistoryRow } from "@/app/actions/executive-pl-confirmed";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function UploadSection({
  title,
  description,
  templateHref,
  history,
  upload,
}: {
  title: string;
  description: string;
  templateHref: string;
  history: (TargetUploadHistoryRow | PlConfirmedUploadHistoryRow)[];
  upload: (formData: FormData) => Promise<{ ok: true; recordCount: number } | { ok: false; message: string; errors?: string[] }>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setErrors([]);

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await upload(formData);
      if (!result.ok) {
        setMessage(result.message);
        setErrors(result.errors ?? []);
      } else {
        setMessage(`${result.recordCount}건 반영 완료`);
        router.refresh();
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  return (
    <div className="rounded-lg border border-mist bg-white">
      <div className="border-b border-mist px-5 py-4">
        <h2 className="text-sm font-semibold text-inktext">{title}</h2>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          id={`upload-${title}`}
          onChange={handleChange}
          disabled={isPending}
        />
        <label
          htmlFor={`upload-${title}`}
          className={`cursor-pointer rounded-md bg-ink hover:bg-ink2 text-salt text-sm font-medium px-4 py-2 transition-colors ${isPending ? "opacity-70 pointer-events-none" : ""}`}
        >
          {isPending ? "업로드하는 중…" : "엑셀 업로드"}
        </label>
        <a href={templateHref} className="rounded-md border border-mist px-4 py-2 text-sm text-muted hover:bg-mist/40">
          템플릿 다운로드
        </a>
        {message && <span className="text-sm text-muted">{message}</span>}
      </div>

      {errors.length > 0 && (
        <div className="mx-5 mb-4 rounded-lg border border-crimsond/30 bg-crimson/5 p-4 text-sm text-crimsond">
          <p className="font-medium">오류 {errors.length}건</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-mist">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist bg-mist/40 text-left text-xs text-muted">
              <th className="px-5 py-2 font-medium">업로드 일시</th>
              <th className="px-5 py-2 font-medium">파일명</th>
              <th className="px-5 py-2 font-medium">업로드자</th>
              <th className="px-5 py-2 font-medium">건수</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {history.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-sm text-muted">
                  업로드 이력이 없습니다.
                </td>
              </tr>
            ) : (
              history.map((h, i) => (
                <tr key={i}>
                  <td className="px-5 py-3 font-mono text-xs text-muted">{formatDateTime(h.created_at)}</td>
                  <td className="px-5 py-3">{h.file_name ?? "-"}</td>
                  <td className="px-5 py-3">{h.uploaded_by_name ?? "-"}</td>
                  <td className="px-5 py-3">{h.row_count}건</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExecutiveTargetUpload({
  targetHistory,
  plConfirmedHistory,
}: {
  targetHistory: TargetUploadHistoryRow[];
  plConfirmedHistory: PlConfirmedUploadHistoryRow[];
}) {
  return (
    <div className="space-y-6">
      <UploadSection
        title="매출/생산 목표"
        description="주간업무보고의 계획(목표) 수치. 법인별 매출 목표(주간/월간) + 태평소금 생산 목표(천일염/가공염, 주간/월간). 태평염전 생산 목표는 염전관리팀이 생산량 화면에서 별도로 업로드합니다."
        templateHref="/templates/executive-targets-template.xlsx"
        history={targetHistory}
        upload={uploadTargets}
      />
      <UploadSection
        title="회계팀 확정 손익"
        description="법인별(태평소금/태평염전/섬들채) 월별 매출/매출원가/판관비/영업외수익/영업외비용. 손익자료 화면에서 Y-ERP 자동집계(전산)와 나란히 비교됩니다."
        templateHref="/templates/executive-pl-confirmed-template.xlsx"
        history={plConfirmedHistory}
        upload={uploadPlConfirmed}
      />
    </div>
  );
}
