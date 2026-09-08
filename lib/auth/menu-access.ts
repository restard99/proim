import "server-only";
import type { createClient } from "@/lib/supabase/server";

// 로그인한 사용자에게 개인별로 추가 허용된 메뉴(href) 목록을 가져온다. 사이드바 노출
// 판정(getVisibleBusinessNavItems)과 각 페이지의 접근 가드가 공통으로 사용한다.
export async function getGrantedHrefs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase.from("user_menu_grants").select("menu_href").eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.menu_href as string));
}
