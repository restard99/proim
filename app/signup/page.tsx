import Image from "next/image";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex">
      <AuthBrandPanel
        headline={"처음 오셨다면\n등록부터 시작하세요"}
        tagline="가입 후 관리자 승인이 완료되면 이용할 수 있습니다."
      />

      <main className="flex-1 flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-3 rounded-lg bg-white px-4 py-2.5 shadow-sm w-fit">
            <Image src="/logo.png" alt="태평염전 로고" width={403} height={143} className="h-7 w-auto" />
          </div>
          <SignupForm />
        </div>
      </main>
    </div>
  );
}
