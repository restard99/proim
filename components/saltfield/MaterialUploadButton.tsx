"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadMaterialInventory } from "@/app/actions/saltfield-materials";

export function MaterialUploadButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadMaterialInventory(formData);
      if (!result.ok) {
        setError(result.message);
      } else {
        router.refresh();
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-crimsond">{error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        id="material-upload"
        onChange={handleChange}
        disabled={isPending}
      />
      <label
        htmlFor="material-upload"
        className={`cursor-pointer rounded-md bg-crimson hover:bg-crimsond text-salt text-sm font-medium px-4 py-2.5 transition-colors ${isPending ? "opacity-70 pointer-events-none" : ""}`}
      >
        {isPending ? "업로드하는 중…" : "엑셀 업로드"}
      </label>
    </div>
  );
}
