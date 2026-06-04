import React, { FC, HTMLAttributes, useCallback, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchContent } from "@/lib/backend";

// Props interface for the MarkdownRenderer component
interface MarkdownRendererProps {
  tabId?: string;
  filePath?: string;
  content: string;
  showControlPanel: boolean; // Optional prop to indicate if the content is editable
}

// Custom component props for HTML elements, extending HTMLAttributes
interface MarkdownComponentProps<
  T extends HTMLElement,
> extends HTMLAttributes<T> {
  children?: React.ReactNode;
}

const MarkdownRenderer: FC<MarkdownRendererProps> = ({
  tabId,
  filePath,
  content: initialContent,
  showControlPanel,
}) => {
  const [content, setContent] = useState<string>(initialContent);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!tabId || !filePath) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await fetchContent(tabId, filePath);
      setContent(fetched);
    } catch (err) {
      setError(
        "Failed to generate content. Please check your API key and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [tabId, filePath]);

  const components: Components = {
    h1: ({
      children,
      ...props
    }: MarkdownComponentProps<HTMLHeadingElement>) => (
      <h1
        className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl"
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({
      children,
      ...props
    }: MarkdownComponentProps<HTMLHeadingElement>) => (
      <h2
        className="mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0"
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({
      children,
      ...props
    }: MarkdownComponentProps<HTMLHeadingElement>) => (
      <h3
        className="mt-8 scroll-m-20 text-2xl font-semibold tracking-tight"
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({
      children,
      ...props
    }: MarkdownComponentProps<HTMLHeadingElement>) => (
      <h4
        className="scroll-m-20 text-xl font-semibold tracking-tight"
        {...props}
      >
        {children}
      </h4>
    ),
    p: ({
      children,
      ...props
    }: MarkdownComponentProps<HTMLParagraphElement>) => (
      <p className="leading-7 [&:not(:first-child)]:mt-6" {...props}>
        {children}
      </p>
    ),
    blockquote: ({
      children,
      ...props
    }: MarkdownComponentProps<HTMLQuoteElement>) => (
      <blockquote
        className="mt-6 border-l-2 pl-6 italic text-gray-600"
        {...props}
      >
        {children}
      </blockquote>
    ),
    ul: ({ children, ...props }: MarkdownComponentProps<HTMLUListElement>) => (
      <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: MarkdownComponentProps<HTMLOListElement>) => (
      <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props}>
        {children}
      </ol>
    ),
    code: ({
      inline,
      children,
      ...props
    }: MarkdownComponentProps<HTMLElement> & { inline?: boolean }) =>
      inline ? (
        <code
          className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm"
          {...props}
        >
          {children}
        </code>
      ) : (
        <pre className="my-4 overflow-x-auto rounded bg-muted p-4 font-mono text-sm">
          <code {...props}>{children}</code>
        </pre>
      ),
    table: ({
      children,
      ...props
    }: MarkdownComponentProps<HTMLTableElement>) => (
      <div className="my-6 w-full overflow-x-auto">
        <table className="w-full border-collapse" {...props}>
          {children}
        </table>
      </div>
    ),
    th: ({
      children,
      ...props
    }: MarkdownComponentProps<HTMLTableHeaderCellElement>) => (
      <th
        className="border px-4 py-2 text-left font-semibold bg-gray-100 [&[align=center]]:text-center [&[align=right]]:text-right"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({
      children,
      ...props
    }: MarkdownComponentProps<HTMLTableDataCellElement>) => (
      <td
        className="border px-4 py-2 text-left align-top [&[align=center]]:text-center [&[align=right]]:text-right"
        {...props}
      >
        {children}
      </td>
    ),
    tr: ({
      children,
      ...props
    }: MarkdownComponentProps<HTMLTableRowElement>) => (
      <tr className="even:bg-gray-50 border-t" {...props}>
        {children}
      </tr>
    ),
  };

  return (
    <div className="border-t-2 mt-2.5 h-full w-full prose prose-slate max-w-none p-6 dark:prose-invert text-muted-foreground overflow-y-auto scrollbar-thin">
      {content.length === 0 && !isLoading && (
        <div className="m-0 p-0 h-full flex flex-col items-center justify-center self-center overflow-hidden">
          <div className="flex flex-col items-center justify-center self-center text-center text-gray-500 overflow-hidden">
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <p>
              No content available yet. Click the button below to generate
              content.
            </p>
            <p className="text-lg">Generate Content</p>
            <Button
              onClick={handleGenerate}
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl transition-all duration-150"
            >
              <Plus className="h-[15px] w-[15px]" />
              Generate
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="h-full flex items-center justify-center text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Generating...
        </div>
      )}

      {!isLoading && content.length > 0 && (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      )}
    </div>
  );
};

export default MarkdownRenderer;
