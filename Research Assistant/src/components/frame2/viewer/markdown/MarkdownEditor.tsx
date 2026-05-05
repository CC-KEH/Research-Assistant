import React, { useRef } from "react";

interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  onSave?: (content: string) => void;
}

export default function MarkdownEditor({
  value,
  onChange,
  onSave,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const applyFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newValue =
      value.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      value.substring(end);

    onChange?.(newValue);
    setTimeout(() => {
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = start + prefix.length + selectedText.length;
      textarea.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S or Cmd+S - Save
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      onSave?.(value);
    }

    // Ctrl+B or Cmd+B - Bold
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      applyFormatting("**", "**");
    }

    // Ctrl+I or Cmd+I - Italic
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      applyFormatting("*", "*");
    }

    // Tab
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue =
          value.substring(0, start) + "\t" + value.substring(end);
        onChange?.(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      }
    }
  };

  return (
    <div className="border-t-2 mt-2.5 relative w-full flex-1 min-h-0 flex flex-col overflow-hidden">
      <div
        ref={highlightRef}
        className="absolute top-0 left-0 mt-3  w-full h-full font-mono text-sm pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter your markdown here... (KaTeX: $x^2$ or $$x^2$$)"
        className="relative z-10 w-full h-175 py-6 px-4 overflow-y-auto scrollbar-thin font-mono text-sm resize-none bg-transparent focus:outline-none border-none"
      />
    </div>
  );
}
