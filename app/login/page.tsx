import Image from "next/image";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      <AuthBrandPanel
        headline={"팀의 하루가 모여\n바다처럼 채워집니다"}
        tagline="태평소금 · 태평염전 · 섬들채 통합 일일업무보고 시스템"
      />

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <Image src="/logo.png" alt="태평염전 로고" width={403} height={143} className="h-7 w-auto" />
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
