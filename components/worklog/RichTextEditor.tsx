"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-30 ${
        active ? "bg-ink text-salt" : "text-inktext hover:bg-mist"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-mist bg-salt px-2 py-1.5">
      <ToolbarButton label="굵게" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton
        label="밑줄"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton
        label="취소선"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span className="line-through">S</span>
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-mist" />
      <ToolbarButton
        label="글머리 목록"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •≡
      </ToolbarButton>
      <ToolbarButton
        label="번호 목록"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.≡
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-mist" />
      <ToolbarButton
        label="표 삽입"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        표삽입
      </ToolbarButton>
      <ToolbarButton
        label="행 추가"
        disabled={!editor.isActive("table")}
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        +행
      </ToolbarButton>
      <ToolbarButton
        label="열 추가"
        disabled={!editor.isActive("table")}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        +열
      </ToolbarButton>
      <ToolbarButton
        label="행 삭제"
        disabled={!editor.isActive("table")}
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        -행
      </ToolbarButton>
      <ToolbarButton
        label="열 삭제"
        disabled={!editor.isActive("table")}
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        -열
      </ToolbarButton>
      <ToolbarButton
        label="표 삭제"
        disabled={!editor.isActive("table")}
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        표삭제
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "worklog-rte px-3.5 py-3 text-sm leading-relaxed focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // 다른 항목을 선택해 폼이 비워지는 등 외부에서 value가 바뀌는 경우에만 동기화한다
  // (매 키 입력마다 동기화하면 커서 위치가 튄다).
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-md border border-mist focus-within:border-brine focus-within:ring-2 focus-within:ring-brine/30">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="max-h-[420px] min-h-[280px] overflow-y-auto bg-white" />
    </div>
  );
}
