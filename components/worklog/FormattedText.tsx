"use client";

import { Fragment } from "react";

// 종합보고서 내용에 **제목** 형태로 표시된 부분을 굵게 렌더링한다.
// textarea는 서식을 표시할 수 없어 편집 중에는 그대로 **로 보이고,
// 읽기 전용으로 보여주는 곳에서만 굵게 표시된다.
export function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <strong key={i} className="font-semibold text-inktext">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
