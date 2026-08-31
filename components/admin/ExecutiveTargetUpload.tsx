"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadTargets, type TargetUploadHistoryRow } from "@/app/actions/executive-targets";
import { uploadPlConfirmed, type PlConfirmedUploadHistoryRow } from "@/app/actions/executive-pl-confirmed";
import { uploadPlBusinessUnit, type PlBusinessUnitUploadHistoryRow } from "@/app/actions/executive-pl-business-unit";
import { EXECUTIVE_PL_CORPS } from "@/lib/yerp/executive-corps";

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

function BusinessUnitUploadSection({ history }: { history: PlBusinessUnitUploadHistoryRow[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [corpCode, setCorpCode] = useState<string>(EXECUTIVE_PL_CORPS[0].corpCode);
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
    formData.set("year", String(year));
    formData.set("corpCode", corpCode);

    startTransition(async () => {
      const result = await uploadPlBusinessUnit(formData);
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
        <h2 className="text-sm font-semibold text-inktext">부문별 손익</h2>
        <p className="mt-1 text-xs text-muted">
          법인 산하 부문별(섬들채: 소금가게/쇼핑몰/… 업장별 / 태평소금·태평염전: 제품매출·상품매출 등 부문별) 월별
          손익. 회계팀이 쓰는 워크북을 그 구조 그대로 업로드하면 됩니다 — 시트 하나에 부문 하나(섬들채 방식)이거나,
          한 시트 안에 &ldquo;③-1 OO 손익&rdquo;처럼 부문별 구획이 여러 개(태평소금 방식)인 경우 모두 지원합니다.
          손익자료 화면의 해당 법인 탭 하단에 부문별 상세로 표시됩니다.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <label className="flex items-center gap-2 text-sm text-muted">
          법인
          <select
            value={corpCode}
            onChange={(e) => setCorpCode(e.target.value)}
            className="rounded-md border border-mist px-2 py-1.5 text-sm outline-none"
          >
            {EXECUTIVE_PL_CORPS.map((c) => (
              <option key={c.corpCode} value={c.corpCode}>
                {c.corpName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          연도
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-mist px-2 py-1.5 text-sm outline-none"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </label>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          id="upload-business-unit"
          onChange={handleChange}
          disabled={isPending}
        />
        <label
          htmlFor="upload-business-unit"
          className={`cursor-pointer rounded-md bg-ink hover:bg-ink2 text-salt text-sm font-medium px-4 py-2 transition-colors ${isPending ? "opacity-70 pointer-events-none" : ""}`}
        >
          {isPending ? "업로드하는 중…" : "엑셀 업로드"}
        </label>
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
  plBusinessUnitHistory,
}: {
  targetHistory: TargetUploadHistoryRow[];
  plConfirmedHistory: PlConfirmedUploadHistoryRow[];
  plBusinessUnitHistory: PlBusinessUnitUploadHistoryRow[];
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
      <BusinessUnitUploadSection history={plBusinessUnitHistory} />
    </div>
  );
}
