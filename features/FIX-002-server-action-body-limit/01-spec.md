# FIX-002: 서버 액션 파일 업로드 1MB 제한 문제

## 문제 상황
염전관리팀 계정으로 생산량/부자재재고 엑셀을 업로드할 때 1MB가 넘는 파일에서 오류가 발생.

## 현재 동작
Next.js 서버 액션(`"use server"`)은 기본적으로 요청 바디 크기를 1MB로 제한한다. 업로드 액션들(`uploadProductionReport`, `uploadMaterialInventory`, 생산의뢰서/생산일지 업로드 등)은 자체적으로 15MB까지 허용하도록 검증하지만, Next.js 프레임워크 레벨의 1MB 제한이 그보다 먼저 걸려 조용히 실패한다.

## 기대 동작
15MB(각 업로드 액션의 `MAX_SIZE`)까지는 정상 업로드된다.

## 영향 범위
- `next.config.ts`: `experimental.serverActions.bodySizeLimit` 설정 추가
- 서버 액션으로 파일을 받는 모든 업로드 기능(생산의뢰서, 생산일지, 염전관리팀 생산량/부자재재고)에 공통 적용
