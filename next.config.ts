import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.33.111", "192.168.219.120"],
  experimental: {
    serverActions: {
      // 서버 액션 기본 요청 크기 제한(1MB)이 엑셀 업로드(최대 15MB)보다 작아서
      // 큰 파일을 올리면 조용히 실패했다. 업로드 액션들의 MAX_SIZE(15MB)에 맞춘다.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
