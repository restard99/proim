"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseProductionLogWorkbook, type ProductionLogSheet } from "@/lib/production-logs/parse";

const BUCKET = "production-logs";
const MAX_SIZE = 15 * 1024 * 1024;

export type ProductionLogListRow = {
  id: string;
  period_label: string;
  file_name: string;
  uploaded_by_name: string | null;
  uploaded_by: string;
  created_at: string;
};

export type ProductionLogDetail = {
  id: string;
  period_label: string;
  file_name: string;
  file_path: string;
  sheets: ProductionLogSheet[];
};

export type UploadResult = { ok: true; id: string } | { ok: false; message: string };
export type SaveResult = { ok: true } | { ok: false; message: string };

export type ProcessEfficiency = {
  processName: string;
  totalHours: number;
  actualHours: number;
  utilizationPct: number;
  stopHours: number;
  prepHours: number;
  restHours: number;
  cleanHours: number;
  breakdownHours: number;
  etcHours: number;
  totalInputQty: number;
  totalWorkers: number;
  productivityPerWorker: number;
};

const EFFICIENCY_REQUIRED_HEADERS = ["총근무시간", "실근무시간"];

function parseNum(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// period_label은 항상 extractPeriodLabel()이 만든 "YYYY년 M월" 형식이라(사용자가 자유
// 입력하는 값이 아님), 이 형식을 신뢰해 연월 순서를 비교 가능한 숫자로 변환한다.
function periodSortKey(label: string): number | null {
  const m = label.match(/^(\d{4})년\s*(\d{1,2})월$/);
  if (!m) return null;
  return Number(m[1]) * 12 + Number(m[2]);
}

async function getSelf(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, team, role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    userId: user.id,
    tenantId: profile.tenant_id as string,
    team: profile.team as string,
    role: profile.role as string,
  };
}

function canUpload(self: { team: string; role: string }): boolean {
  return self.role === "admin" || self.team === "생산팀";
}

// 파일명에서 "26년 1월"/"2026년1월" 형태의 기간을 뽑아 "2026년 1월"로 정규화한다.
// 못 찾으면 업로드 시점의 년/월로 대체한다.
function extractPeriodLabel(fileName: string): string {
  const match = fileName.match(/(\d{2,4})\s*년\s*(\d{1,2})\s*월/);
  if (match) {
    const yearStr = match[1];
    const year = yearStr.length === 2 ? 2000 + Number(yearStr) : Number(yearStr);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return `${year}년 ${month}월`;
  }
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
}

export async function uploadProductionLog(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "파일을 선택하세요." };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, message: "파일 크기는 15MB 이하만 가능합니다." };
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return { ok: false, message: "엑셀(.xlsx) 파일만 업로드할 수 있습니다." };
  }

  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { ok: false, message: "로그인이 필요합니다." };
  if (!canUpload(self)) {
    return { ok: false, message: "업로드 권한이 없습니다." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let sheets: ProductionLogSheet[];
  try {
    sheets = await parseProductionLogWorkbook(buffer);
  } catch {
    return { ok: false, message: "엑셀 파일을 읽는 중 오류가 발생했습니다." };
  }
  if (sheets.length === 0 || sheets.every((s) => s.rows.length === 0)) {
    return { ok: false, message: "파일에서 데이터를 찾지 못했습니다. 양식을 확인해주세요." };
  }

  const path = `${self.userId}/${Date.now()}-${crypto.randomUUID()}.xlsx`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  if (uploadError) return { ok: false, message: "파일 업로드 중 오류가 발생했습니다." };

  const { data, error } = await supabase
    .from("production_logs")
    .insert({
      tenant_id: self.tenantId,
      uploaded_by: self.userId,
      team: self.team,
      period_label: extractPeriodLabel(file.name),
      file_path: path,
      file_name: file.name,
      sheets,
    })
    .select("id")
    .single();

  if (error || !data) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, message: "저장 중 오류가 발생했습니다." };
  }

  revalidatePath("/production-logs");
  return { ok: true, id: data.id };
}

export async function getProductionLogList(limit = 30): Promise<ProductionLogListRow[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return [];

  const { data } = await supabase
    .from("production_logs")
    .select("id, period_label, file_name, uploaded_by, created_at, uploader:profiles!uploaded_by(full_name)")
    .order("period_label", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => {
    const uploader = Array.isArray(r.uploader) ? r.uploader[0] : r.uploader;
    return {
      id: r.id,
      period_label: r.period_label,
      file_name: r.file_name,
      uploaded_by: r.uploaded_by,
      uploaded_by_name: (uploader as { full_name: string | null } | null)?.full_name ?? null,
      created_at: r.created_at,
    };
  });
}

export async function getProductionLogDetail(id: string): Promise<ProductionLogDetail | null> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return null;

  const { data } = await supabase
    .from("production_logs")
    .select("id, period_label, file_name, file_path, sheets")
    .eq("id", id)
    .single();

  if (!data) return null;
  return {
    id: data.id,
    period_label: data.period_label,
    file_name: data.file_name,
    file_path: data.file_path,
    sheets: (data.sheets ?? []) as ProductionLogSheet[],
  };
}

export async function getProductionLogFileUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteProductionLog(id: string): Promise<SaveResult> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return { ok: false, message: "로그인이 필요합니다." };

  const { data: row } = await supabase
    .from("production_logs")
    .select("file_path, uploaded_by")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, message: "삭제할 항목을 찾을 수 없습니다." };
  if (row.uploaded_by !== self.userId && self.role !== "admin") {
    return { ok: false, message: "삭제 권한이 없습니다." };
  }

  const { error } = await supabase.from("production_logs").delete().eq("id", id);
  if (error) return { ok: false, message: "삭제 중 오류가 발생했습니다." };

  await supabase.storage.from(BUCKET).remove([row.file_path]);

  revalidatePath("/production-logs");
  return { ok: true };
}

// 생산일지 목록에 실제로 존재하는 기간(period_label)들을 오래된 순으로 반환한다.
// 생산효율 탭의 기간 선택 드롭다운을 채우는 용도.
export async function getProductionLogPeriods(): Promise<string[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return [];

  const { data } = await supabase.from("production_logs").select("period_label");
  const unique = [...new Set((data ?? []).map((r) => r.period_label))];
  return unique.sort((a, b) => (periodSortKey(a) ?? 0) - (periodSortKey(b) ?? 0));
}

// 업로드된 생산일지를 기간 범위(startPeriod~endPeriod, 둘 다 미지정이면 전체)로 누적
// 집계해 공정별 가동률(실근무시간÷총근무시간)과 정지시간 구성을 계산한다.
// "총근무시간"·"실근무시간" 컬럼이 모두 있는 시트만 집계 대상으로 삼아, 세척로스율
// 등 근무시간 데이터가 없는 시트는 자동으로 빠진다.
export async function getProductionEfficiency(
  startPeriod?: string,
  endPeriod?: string,
): Promise<ProcessEfficiency[]> {
  const supabase = await createClient();
  const self = await getSelf(supabase);
  if (!self) return [];

  const { data } = await supabase.from("production_logs").select("period_label, sheets");

  const startKey = startPeriod ? periodSortKey(startPeriod) : null;
  const endKey = endPeriod ? periodSortKey(endPeriod) : null;

  const map = new Map<
    string,
    {
      totalHours: number;
      actualHours: number;
      stopHours: number;
      prepHours: number;
      restHours: number;
      cleanHours: number;
      breakdownHours: number;
      etcHours: number;
      totalInputQty: number;
      totalWorkers: number;
    }
  >();

  for (const row of data ?? []) {
    const rowKey = periodSortKey(row.period_label);
    if (startKey !== null && rowKey !== null && rowKey < startKey) continue;
    if (endKey !== null && rowKey !== null && rowKey > endKey) continue;

    const sheets = (row.sheets ?? []) as ProductionLogSheet[];
    for (const sheet of sheets) {
      if (!EFFICIENCY_REQUIRED_HEADERS.every((h) => sheet.headers.includes(h))) continue;
      const hasProcessCol = sheet.headers.includes("공정명");
      for (const dataRow of sheet.rows) {
        const key = hasProcessCol ? dataRow["공정명"] || "미상" : sheet.name;
        const entry = map.get(key) ?? {
          totalHours: 0,
          actualHours: 0,
          stopHours: 0,
          prepHours: 0,
          restHours: 0,
          cleanHours: 0,
          breakdownHours: 0,
          etcHours: 0,
          totalInputQty: 0,
          totalWorkers: 0,
        };
        entry.totalHours += parseNum(dataRow["총근무시간"]);
        entry.actualHours += parseNum(dataRow["실근무시간"]);
        entry.stopHours += parseNum(dataRow["정지시간"]);
        entry.prepHours += parseNum(dataRow["준비"]);
        entry.restHours += parseNum(dataRow["휴게"]);
        entry.cleanHours += parseNum(dataRow["청소"]);
        entry.breakdownHours += parseNum(dataRow["고장"]);
        entry.etcHours += parseNum(dataRow["기타"]);
        // "인당생산성"(주간_월간_업무보고.xlsx) 리포트의 "생산효율지표(정기근로생산량 ÷
        // 인원)" 개념을 참고해, 우리가 실제로 갖고 있는 컬럼(투입량/투입인원)으로 낼 수
        // 있는 유사 지표를 추가한다. 원본 리포트의 완제품 생산량(kg)·정규 인원 기준과는
        // 다른, 공정 단위 투입량/투입인원 기준의 근사치다.
        entry.totalInputQty += parseNum(dataRow["투입량"]);
        entry.totalWorkers += parseNum(dataRow["투입인원"]);
        map.set(key, entry);
      }
    }
  }

  return [...map.entries()]
    .map(([processName, v]) => ({
      processName,
      ...v,
      utilizationPct: v.totalHours > 0 ? (v.actualHours / v.totalHours) * 100 : 0,
      productivityPerWorker: v.totalWorkers > 0 ? v.totalInputQty / v.totalWorkers : 0,
    }))
    .sort((a, b) => b.utilizationPct - a.utilizationPct);
}
