import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
// If you need extended Markdown features (tables, strikethrough, etc.)
// install remark-gfm (`npm i remark-gfm`) and uncomment the next line.
// import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  /** Raw markdown string to render */
  content: string;
  /** Optional wrapper className */
  className?: string;
}

/**
 * Centralised Markdown renderer used across the application so that we
 * configure things such as syntax-highlighting, link behaviour, etc. in one
 * place. This keeps `MessageBubble` and any future components minimal and
 * maintainable.
 */
const Markdown: React.FC<MarkdownProps> = ({ content, className }) => {
  return (
    <div className={`prose prose-invert max-w-none ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath /* , remarkGfm */]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Custom renderer for code blocks & inline code
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1] as string}
                PreTag="div"
                className="rounded-lg my-2"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code
                className={`bg-gray-700 rounded px-1 py-0.5 ${className || ''}`}
                {...props}
              >
                {children}
              </code>
            );
          },
          a({ children, href, ...props }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;
