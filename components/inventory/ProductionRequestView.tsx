"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import {
  deleteProductionRequest,
  getProductionMaterialStatus,
  getProductionRequestDetail,
  getProductionRequestFileUrl,
  getProductionRequestList,
  updateProductionRequestItems,
  uploadProductionRequest,
  type ProductionRequestDetail,
  type ProductionRequestListRow,
} from "@/app/actions/production-requests";
import type { ProductionRequestFieldKey, ProductionRequestItem } from "@/lib/production-requests/parse";
import type { ProductMaterialStatus } from "@/lib/yerp/production-materials";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatNumberText(v: string): string {
  if (v.trim() === "") return v;
  const n = Number(v.replace(/,/g, ""));
  if (Number.isNaN(n)) return v;
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

const COLUMNS: { key: ProductionRequestFieldKey; label: string; align: "left" | "right" }[] = [
  { key: "name", label: "제품명", align: "left" },
  { key: "category", label: "구분", align: "left" },
  { key: "count", label: "낱개수", align: "right" },
  { key: "pack", label: "입수", align: "right" },
  { key: "boxes", label: "박스수", align: "right" },
  { key: "weightKg", label: "중량(kg)", align: "right" },
  { key: "pl", label: "PL", align: "right" },
  { key: "eaPerPl", label: "EA/PL", align: "right" },
  { key: "note", label: "특이사항", align: "left" },
  { key: "loadType", label: "적재방식", align: "left" },
  { key: "dueDate", label: "완료요청일", align: "left" },
];

const CELL_CLASS = "whitespace-nowrap px-3 py-2 leading-tight";
// 병합된 칸(특이사항 등)은 원본 엑셀에 긴 문구가 들어가는 경우가 많아, 한 줄로 밀어내지 않고
// 적당한 너비에서 줄바꿈되도록 별도 클래스를 쓴다.
const MERGE_CELL_CLASS = "max-w-[300px] whitespace-pre-wrap break-words px-3 py-2 leading-snug";

type EditableFieldKey = ProductionRequestFieldKey | "remark";

function formatQty(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

function MaterialStatusDot({ status }: { status: ProductMaterialStatus | undefined }) {
  if (!status || status.matchType !== "matched" || status.materials.length === 0) {
    const title =
      status?.matchType === "ambiguous"
        ? "품목 후보가 여러 개라 자동 확인 불가 (클릭해서 확인)"
        : "Y-ERP 품목과 매칭되지 않아 확인 불가";
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-mist" title={title} />;
  }
  return status.allSufficient ? (
    <span className="inline-block h-2.5 w-2.5 rounded-full bg-brine" title="부자재 넉넉함" />
  ) : (
    <span className="inline-block h-2.5 w-2.5 rounded-full bg-crimson" title="부자재 부족/애매함" />
  );
}

function MaterialStatusDetail({ status }: { status: ProductMaterialStatus | undefined }) {
  if (!status || status.matchType === "unmatched") {
    return <p className="text-sm text-muted">Y-ERP 품목과 매칭되지 않아 부자재 현황을 확인할 수 없습니다.</p>;
  }
  if (status.matchType === "ambiguous") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">
          품목명 후보가 여러 개라 자동으로 판단할 수 없습니다. Y-ERP 품목명 중 하나로 확인해주세요.
        </p>
        <ul className="list-inside list-disc text-sm text-inktext">
          {status.candidateNames.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (status.materials.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted">매칭된 품목: {status.matchedItemName}</p>
        <p className="text-sm text-muted">등록된 부자재 BOM이 없습니다.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-2 text-xs text-muted">매칭된 품목: {status.matchedItemName}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-mist text-left text-xs text-muted">
            <th className="py-2 font-medium">부자재명</th>
            <th className="py-2 text-right font-medium">소요량</th>
            <th className="py-2 text-right font-medium">재고</th>
            <th className="py-2 text-center font-medium">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-mist">
          {status.materials.map((m) => (
            <tr key={m.itemCode}>
              <td className="py-2">{m.itemName}</td>
              <td className="py-2 text-right font-mono">{formatQty(m.requiredQty)}</td>
              <td className="py-2 text-right font-mono">{formatQty(m.availableQty)}</td>
              <td className="py-2 text-center">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${m.sufficient ? "bg-brine" : "bg-crimson"}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TOTAL_COLUMN_COUNT = COLUMNS.length + 2; // + 부자재, 비고

export function ProductionRequestView({ canManage }: { canManage: boolean }) {
  const [list, setList] = useState<ProductionRequestListRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductionRequestDetail | null>(null);
  const [requestDate, setRequestDate] = useState(todayISO);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingList, startListTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isLoadingDetail, startDetailTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [openingFile, setOpeningFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draftItems, setDraftItems] = useState<ProductionRequestItem[]>([]);

  const [materialMap, setMaterialMap] = useState<Record<string, ProductMaterialStatus>>({});
  const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(null);

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
      setIsEditing(false);
      setMaterialMap({});
      setExpandedItemIndex(null);
      if (!selectedId) {
        setDetail(null);
        return;
      }
      const d = await getProductionRequestDetail(selectedId);
      setDetail(d);
      if (d) {
        const materials = await getProductionMaterialStatus(d.items);
        setMaterialMap(materials);
      }
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

  function startEdit() {
    if (!detail) return;
    setDraftItems(detail.items.map((it) => ({ ...it })));
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setDraftItems([]);
  }

  function updateDraftField(index: number, field: EditableFieldKey, value: string) {
    setDraftItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function saveEdit() {
    if (!detail) return;
    startSaveTransition(async () => {
      const result = await updateProductionRequestItems(detail.id, draftItems);
      if (!result.ok) {
        window.alert(result.message);
        return;
      }
      setDetail({ ...detail, items: draftItems });
      setIsEditing(false);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <div className="h-fit overflow-hidden rounded-lg border border-mist bg-white">
        {canManage && (
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
                {canManage && !isEditing && (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="rounded-md border border-mist px-3 py-1.5 text-xs font-medium text-inktext hover:bg-mist/50"
                  >
                    수정
                  </button>
                )}
                {canManage && isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="rounded-md border border-mist px-3 py-1.5 text-xs font-medium text-inktext hover:bg-mist/50 disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={isSaving}
                      className="rounded-md bg-crimson px-3 py-1.5 text-xs font-medium text-salt hover:bg-crimsond disabled:opacity-50"
                    >
                      저장
                    </button>
                  </>
                )}
                {canManage && !isEditing && (
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
                <table className="w-full min-w-[1300px] text-sm">
                  <thead>
                    <tr className="border-b border-mist bg-mist/40 text-center text-xs text-muted">
                      {COLUMNS.map((c) => (
                        <th key={c.key} className="whitespace-nowrap border-l border-mist px-3 py-2 font-medium first:border-l-0">
                          {c.label}
                        </th>
                      ))}
                      <th className="whitespace-nowrap border-l border-mist px-3 py-2 font-medium">부자재</th>
                      <th className="w-[260px] border-l border-mist px-3 py-2 font-medium">비고</th>
                    </tr>
                  </thead>
                  {!isEditing && (
                    <tbody className="divide-y divide-mist">
                      {detail.items.map((item, i) => {
                        const rowRedClass = item.isRed ? "text-crimsond font-semibold" : "text-inktext";
                        return (
                          <Fragment key={i}>
                          <tr className={rowRedClass}>
                            {COLUMNS.map((c) => {
                              if (item.mergeSkip.includes(c.key)) return null;
                              const isMergeStart = item.merge?.field === c.key;
                              return (
                                <td
                                  key={c.key}
                                  colSpan={isMergeStart ? item.merge!.colSpan : undefined}
                                  rowSpan={isMergeStart ? item.merge!.rowSpan : undefined}
                                  className={`${isMergeStart ? MERGE_CELL_CLASS : CELL_CLASS} border-l border-mist text-center align-middle first:border-l-0 ${
                                    c.align === "right" && !isMergeStart ? "font-mono" : ""
                                  } ${c.key === "name" ? "font-medium" : ""}`}
                                >
                                  {c.key === "name" ? (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedItemIndex((prev) => (prev === i ? null : i))}
                                      className="text-crimson hover:underline"
                                    >
                                      {item.name}
                                    </button>
                                  ) : c.align === "right" && !isMergeStart ? (
                                    formatNumberText(item[c.key])
                                  ) : (
                                    item[c.key]
                                  )}
                                </td>
                              );
                            })}
                            <td className={`${CELL_CLASS} border-l border-mist text-center align-middle`}>
                              <MaterialStatusDot status={materialMap[item.name]} />
                            </td>
                            <td
                              className="w-[260px] max-w-[260px] whitespace-pre-wrap break-words border-l border-mist px-3 py-2 text-center align-middle leading-tight"
                            >
                              {item.remark}
                            </td>
                          </tr>
                          {expandedItemIndex === i && (
                            <tr>
                              <td colSpan={TOTAL_COLUMN_COUNT} className="border-l border-mist bg-salt px-4 py-4">
                                <MaterialStatusDetail status={materialMap[item.name]} />
                              </td>
                            </tr>
                          )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  )}
                  {isEditing && (
                    <tbody className="divide-y divide-mist">
                      {draftItems.map((item, i) => (
                        <tr key={i}>
                          {COLUMNS.map((c) => (
                            <td key={c.key} className="px-1.5 py-1.5">
                              <input
                                type="text"
                                value={item[c.key]}
                                onChange={(e) => updateDraftField(i, c.key, e.target.value)}
                                className={`w-full min-w-[64px] rounded border border-mist px-2 py-1.5 text-sm outline-none focus:border-brine focus:ring-1 focus:ring-brine/30 ${
                                  c.align === "right" ? "text-right font-mono" : ""
                                }`}
                              />
                            </td>
                          ))}
                          <td className="px-1.5 py-1.5 text-center">
                            <MaterialStatusDot status={materialMap[item.name]} />
                          </td>
                          <td className="w-[260px] px-1.5 py-1.5">
                            <input
                              type="text"
                              value={item.remark}
                              onChange={(e) => updateDraftField(i, "remark", e.target.value)}
                              className="w-full min-w-[240px] rounded border border-mist px-2 py-1.5 text-sm outline-none focus:border-brine focus:ring-1 focus:ring-brine/30"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                  {!isEditing && detail.totals && (
                    <tfoot>
                      <tr className="border-t border-mist bg-mist/40 text-center font-semibold text-inktext">
                        <td className={`${CELL_CLASS} border-l border-mist first:border-l-0`}>소계</td>
                        <td className={`${CELL_CLASS} border-l border-mist`} />
                        <td className={`${CELL_CLASS} border-l border-mist font-mono`}>{formatNumberText(detail.totals.count)}</td>
                        <td className={`${CELL_CLASS} border-l border-mist`} />
                        <td className={`${CELL_CLASS} border-l border-mist`} />
                        <td className={`${CELL_CLASS} border-l border-mist font-mono`}>{formatNumberText(detail.totals.weightKg)}</td>
                        <td className={`${CELL_CLASS} border-l border-mist font-mono`}>{formatNumberText(detail.totals.pl)}</td>
                        <td colSpan={6} className={`${CELL_CLASS} border-l border-mist`} />
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
                      <tr className="border-b border-mist bg-mist/40 text-center text-xs text-muted">
                        <th className="whitespace-nowrap border-l border-mist px-3 py-2 font-medium first:border-l-0">반제품명</th>
                        <th className="whitespace-nowrap border-l border-mist px-3 py-2 font-medium">의뢰량(kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mist">
                      {detail.sub_items.map((s, i) => (
                        <tr key={i} className="text-center text-inktext">
                          <td className={`${CELL_CLASS} border-l border-mist first:border-l-0`}>{s.name}</td>
                          <td className={`${CELL_CLASS} border-l border-mist font-mono`}>{formatNumberText(s.amountKg)}</td>
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
