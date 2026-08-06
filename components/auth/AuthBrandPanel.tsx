import Image from "next/image";
import { Fragment } from "react";

interface AuthBrandPanelProps {
  headline: string;
  tagline: string;
  className?: string;
}

const GLOW_CELLS = new Set([1, 8]);

export function AuthBrandPanel({ headline, tagline, className = "" }: AuthBrandPanelProps) {
  const headlineLines = headline.split("\n");

  return (
    <aside
      className={`hidden lg:flex lg:w-[42%] relative flex-col justify-between overflow-hidden bg-ink text-salt px-12 py-10 ${className}`}
    >
      <div className="saltpan-grid" aria-hidden="true">
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className={`saltpan-cell${GLOW_CELLS.has(i) ? " glow" : ""}`} />
        ))}
      </div>
      <div className="saltpan-shimmer" aria-hidden="true" />

      <div className="relative z-10 inline-flex items-center gap-3 rounded-lg bg-white px-5 py-3 shadow-md shadow-black/20 w-fit">
        <Image src="/logo.png" alt="태평염전 로고" width={403} height={143} className="h-9 w-auto" priority />
      </div>

      <div className="relative z-10 space-y-4">
        <p className="font-display text-4xl leading-snug">
          {headlineLines.map((line, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </p>
        <p className="text-sm text-sand/90">{tagline}</p>
      </div>

      <p className="relative z-10 text-xs text-salt/40">© 소금사업부 사내전용 시스템입니다.</p>
    </aside>
  );
}
