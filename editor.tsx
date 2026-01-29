import MDEditor from "@uiw/react-md-editor";
import { getCodeString } from "rehype-rewrite";
import katex from "katex";
import "katex/dist/katex.css";
import React from "react";

interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
}

export default function MarkdownEditor({
  value,
  onChange,
}: MarkdownEditorProps) {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    // Check if dark mode is currently active
    const darkMode = document.documentElement.classList.contains("dark");
    setIsDark(darkMode);

    // Listen for changes to the dark class
    const observer = new MutationObserver(() => {
      const isDarkNow = document.documentElement.classList.contains("dark");
      setIsDark(isDarkNow);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);
  return (
    <>
      <style>{`
        [data-color-mode="dark"] .w-md-editor {
          background-color: #000000 !important;
          color: #ffffff !important;
        }
        [data-color-mode="dark"] .w-md-editor-text-input {
          background-color: #000000 !important;
          color: #ffffff !important;
        }
        [data-color-mode="dark"] .w-md-editor-preview {
          background-color: #000000 !important;
          color: #ffffff !important;
        }
        [data-color-mode="dark"] .w-md-editor-toolbar {
          background-color: #111111 !important;
          border-color: #333333 !important;
        }
          
      `}</style>
      <div data-color-mode={isDark ? "dark" : "light"} className="mt-3">
        <MDEditor
          autoFocus={true}
          value={value}
          autoFocusEnd={true}
          visibleDragbar={false}
          onChange={(val) => onChange?.(val || "")}
          preview="edit"
          height={685}
          className="w-xl"
          textareaProps={{
            placeholder: "Please enter Markdown text",
          }}
          previewOptions={{
            components: {
              code: ({ children = [], className, ...props }) => {
                if (
                  typeof children === "string" &&
                  /^\$\$(.*)\$\$/.test(children)
                ) {
                  const html = katex.renderToString(
                    children.replace(/^\$\$(.*)\$\$/, "$1"),
                    {
                      throwOnError: false,
                    },
                  );
                  return (
                    <code
                      dangerouslySetInnerHTML={{ __html: html }}
                      style={{ background: "transparent" }}
                    />
                  );
                }
                const code =
                  props.node && props.node.children
                    ? getCodeString(props.node.children)
                    : children;
                if (
                  typeof code === "string" &&
                  typeof className === "string" &&
                  /^language-katex/.test(className.toLocaleLowerCase())
                ) {
                  const html = katex.renderToString(code, {
                    throwOnError: false,
                  });
                  return (
                    <code
                      style={{ fontSize: "150%" }}
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  );
                }
                return <code className={String(className)}>{children}</code>;
              },
            },
          }}
        />
      </div>
    </>
  );
}
