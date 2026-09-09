"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  uploadSeomdeulchaeSalesRaw,
  type SalesRawSummary,
} from "@/app/actions/executive-seomdeulchae-sales";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// 섬들채 POS의 "일자별 (상품별)" 내보내기(.xls/.xlsx)를 업로드하면, 업장별 주간업무보고
// 실적(6페이지)에 그때그때 반영된다. 같은 날짜·업장·상품코드는 다시 올려도 갱신될 뿐
// 중복되지 않아서, 겹치는 기간을 포함해 다시 올려도 안전하다.
export function SeomdeulchaeSalesUploadPanel({ summary }: { summary: SalesRawSummary }) {
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
      const result = await uploadSeomdeulchaeSalesRaw(formData);
      if (!result.ok) {
        setMessage(result.message);
        setErrors(result.errors ?? []);
      } else {
        setMessage(`${result.dateRange.start} ~ ${result.dateRange.end} 기간 ${result.recordCount}건 반영 완료`);
        router.refresh();
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          id="upload-seomdeulchae-sales"
          onChange={handleChange}
          disabled={isPending}
        />
        <label
          htmlFor="upload-seomdeulchae-sales"
          className={`cursor-pointer rounded-md bg-ink hover:bg-ink2 text-salt text-sm font-medium px-4 py-2 transition-colors ${isPending ? "opacity-70 pointer-events-none" : ""}`}
        >
          {isPending ? "업로드하는 중… (수 만 건이라 시간이 걸릴 수 있습니다)" : "엑셀 업로드 (.xls/.xlsx)"}
        </label>
        {message && <span className="text-sm text-muted">{message}</span>}
      </div>

      {errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-crimsond/30 bg-crimson/5 p-4 text-sm text-crimsond">
          <p className="font-medium">오류 {errors.length}건</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-mist bg-salt/60 px-4 py-3 text-sm text-muted">
        {summary.rowCount === 0 ? (
          <p>아직 업로드된 실적 데이터가 없습니다.</p>
        ) : (
          <p>
            현재 <span className="font-medium text-inktext">{summary.rowCount.toLocaleString("ko-KR")}건</span> 저장됨
            ({summary.minDate} ~ {summary.maxDate}) · 마지막 업로드{" "}
            {summary.lastUploadedAt ? formatDateTime(summary.lastUploadedAt) : "-"}
          </p>
        )}
      </div>
    </div>
  );
}
