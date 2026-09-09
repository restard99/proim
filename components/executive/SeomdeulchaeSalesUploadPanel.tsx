"use client";

// 섬들채 업장별 실적(매출) 업로드 — 파일 형식이 아직 확정되지 않아 메뉴/권한 뼈대만 먼저
// 만들어둔다. 관리자가 "게시판 권한"에서 지정한 섬들채 담당자에게 개별로 이 메뉴를 열어줄 수
// 있고, 이 화면을 통해 그 담당자가 직접 업로드할 수 있게 될 예정이다.
export function SeomdeulchaeSalesUploadPanel() {
  return (
    <div className="rounded-lg border border-dashed border-mist bg-white px-6 py-16 text-center">
      <p className="text-sm font-medium text-inktext">매출업로드 기능 준비 중</p>
      <p className="mt-2 text-sm text-muted">
        섬들채 업장별 실적(매출) 파일 형식이 확정되면 이 화면에서 바로 업로드할 수 있게 됩니다.
      </p>
    </div>
  );
}
