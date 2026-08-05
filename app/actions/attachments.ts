"use server";

import { createClient } from "@/lib/supabase/server";

const BUCKET = "worklog-attachments";
const MAX_SIZE = 10 * 1024 * 1024;

export type UploadResult = { ok: true; path: string; name: string } | { ok: false; message: string };

export async function uploadWorklogAttachment(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "파일을 선택하세요." };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, message: "파일 크기는 10MB 이하만 가능합니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요합니다." };

  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
  });
  if (error) return { ok: false, message: "파일 업로드 중 오류가 발생했습니다." };

  return { ok: true, path, name: file.name };
}

export async function getAttachmentUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  return data.signedUrl;
}
