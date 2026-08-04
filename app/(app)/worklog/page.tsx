import { PlaceholderScreen } from "@/components/layout/PlaceholderScreen";

export default function WorklogPage() {
  return (
    <PlaceholderScreen
      iconPath="M5 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.828a2 2 0 0 0-.586-1.414l-3.828-3.828A2 2 0 0 0 11.172 2H5Zm1 8a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H6Zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H6Z"
      evenOdd
      title="업무일지 화면 준비 중입니다"
      description={
        <>
          현장 업무일지 작성·조회 기능이
          <br />
          이 자리에 순차적으로 채워질 예정입니다.
        </>
      }
    />
  );
}
