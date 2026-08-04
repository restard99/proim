import { PlaceholderScreen } from "@/components/layout/PlaceholderScreen";

export default function HomePage() {
  return (
    <PlaceholderScreen
      iconPath="M10 2 2 8.5V18h5v-6h6v6h5V8.5L10 2Z"
      title="홈 화면 준비 중입니다"
      description={
        <>
          오늘 현황, 주요 일정 요약 등의 내용이
          <br />
          이 자리에 순차적으로 채워질 예정입니다.
        </>
      }
    />
  );
}
