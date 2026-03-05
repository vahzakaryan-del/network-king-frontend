"use client";

import { useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export default function RichQuestionEditor({ value, onChange, placeholder }: Props) {
  const safeValue = useMemo(() => value ?? "", [value]);

  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit,
      TextStyle, // ✅ required for color
      Color,     // ✅ color support
    ],

    content: safeValue,

    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },

    editorProps: {
      attributes: {
        class:
          "w-full min-h-[88px] px-3 py-2 rounded bg-white/10 border border-white/15 outline-none text-white",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (safeValue !== current) {
      editor.commands.setContent(safeValue, { emitUpdate: false });
    }
  }, [safeValue, editor]);

  if (!editor) return null;

  const showPlaceholder = !!placeholder && !editor.getText().trim();

  return (
    <div className="space-y-2">
      {/* TOOLBAR */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-2 rounded bg-gray-600 text-white text-sm ${
            editor.isActive("bold") ? "ring-2 ring-white/30" : ""
          }`}
        >
          Bold
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-2 rounded bg-gray-600 text-white text-sm ${
            editor.isActive("italic") ? "ring-2 ring-white/30" : ""
          }`}
        >
          Italic
        </button>

        {/* QUICK COLOR BUTTONS */}
        <button
          onClick={() => editor.chain().focus().setColor("#ffffff").run()}
          className="px-3 py-2 rounded bg-gray-600 text-white text-sm"
        >
          White
        </button>

        <button
          onClick={() => editor.chain().focus().setColor("#fbbf24").run()}
          className="px-3 py-2 rounded bg-amber-400 text-black text-sm"
        >
          Amber
        </button>

        <button
          onClick={() => editor.chain().focus().setColor("#60a5fa").run()}
          className="px-3 py-2 rounded bg-blue-400 text-black text-sm"
        >
          Blue
        </button>

        <button
          onClick={() => editor.chain().focus().unsetColor().run()}
          className="px-3 py-2 rounded bg-gray-500 text-white text-sm"
        >
          Reset
        </button>

        {/* COLOR PICKER */}
        <input
          type="color"
          onChange={(e) =>
            editor.chain().focus().setColor(e.target.value).run()
          }
          className="h-9 w-9 p-0 border-none cursor-pointer rounded"
          title="Pick text color"
        />
      </div>

      {/* EDITOR */}
      <div className="relative">
        {showPlaceholder && (
          <div className="pointer-events-none absolute top-2 left-3 text-white/40">
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
