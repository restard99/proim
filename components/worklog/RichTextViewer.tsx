"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

// 편집기와 동일한 스키마로 다시 파싱해서 보여준다(같은 확장 목록 밖의 태그/속성은
// 자동으로 걸러지므로, 저장된 HTML을 dangerouslySetInnerHTML로 그대로 꽂는 것보다 안전하다).
export function RichTextViewer({ html }: { html: string }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline, Table, TableRow, TableHeader, TableCell],
    content: html,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "worklog-rte text-xs leading-relaxed" },
    },
  });

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}
