import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CodeBlock } from "./code-block";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system" | "data";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  // If it's a system message, we don't render it here (chat-messages handles it)
  // or if we must, just return null to avoid breaking layout
  if (role === "system" || role === "data") return null;

  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] md:max-w-[80%] flex items-start gap-4 relative group",
          isUser
            ? "bg-black/5 rounded-2xl px-5 py-3.5 text-text-main shadow-sm"
            : "px-2 py-1 text-text-main"
        )}
      >
        {!isUser && (
          <div className="shrink-0 w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-sm shadow-sm mt-0.5">
            S
          </div>
        )}

        <div className={cn(
          "flex-1 whitespace-pre-wrap break-words leading-relaxed text-[15px] overflow-hidden",
          !isUser && "pt-1"
        )}>
          {isUser ? (
            <>
              {content}
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-text-main/50 animate-pulse align-middle" />
              )}
            </>
          ) : (
            <div className="markdown-prose w-full overflow-hidden text-text-main">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  h1: ({ children }) => <h1 className="text-text-main text-2xl font-semibold mb-4 mt-6">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-text-main text-xl font-semibold mb-3 mt-5">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-text-main text-lg font-semibold mb-3 mt-4">{children}</h3>,
                  h4: ({ children }) => <h4 className="text-text-main text-base font-semibold mb-2 mt-4">{children}</h4>,
                  p: ({ children }) => <p className="mb-4 last:mb-0 leading-7">{children}</p>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline underline-offset-2">
                      {children}
                    </a>
                  ),
                  ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                  li: ({ children }) => <li className="marker:text-text-muted">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-border-main pl-4 italic text-text-muted mb-4 py-1">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-4 border border-border-main rounded-lg">
                      <table className="w-full text-left border-collapse bg-surface">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => <th className="border-b border-border-main px-4 py-2 font-medium bg-black/5 text-text-muted">{children}</th>,
                  td: ({ children }) => <td className="border-b border-border-main px-4 py-2 last:border-b-0">{children}</td>,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code: ({ inline, className, children, node, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || "");
                    const language = match ? match[1] : "";

                    // Extract raw text for copying
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const extractText = (node: any): string => {
                      if (!node) return "";
                      if (node.type === "text") return node.value || "";
                      if (node.children) return node.children.map(extractText).join("");
                      return "";
                    };

                    const rawCodeString = node ? extractText(node) : String(children).replace(/\n$/, "");
                    const codeString = rawCodeString.replace(/\n$/, "");

                    if (!inline) {
                      return (
                        <CodeBlock language={language} value={codeString}>
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </CodeBlock>
                      );
                    }

                    return (
                      <code className="bg-black/5 text-accent font-mono text-[0.9em] px-1.5 py-0.5 rounded" {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-text-main/50 animate-pulse align-middle" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
