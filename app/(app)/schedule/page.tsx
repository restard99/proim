import { PlaceholderScreen } from "@/components/layout/PlaceholderScreen";

export default function SchedulePage() {
  return (
    <PlaceholderScreen
      iconPath="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm10 6H4v8h12V8Z"
      title="일정관리 화면 준비 중입니다"
      description={
        <>
          달력, 일정 등록·조회 기능이
          <br />
          이 자리에 순차적으로 채워질 예정입니다.
        </>
      }
    />
  );
}
