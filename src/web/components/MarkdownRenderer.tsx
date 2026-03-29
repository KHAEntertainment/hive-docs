import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Configure marked with syntax highlighting via extension
    marked.use({
      renderer: {
        code({ text, lang }: { text: string; lang?: string }): string {
          if (lang && hljs.getLanguage(lang)) {
            try {
              const highlighted = hljs.highlight(text, { language: lang }).value;
              return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
            } catch {
              // Fall through to auto-highlight
            }
          }
          const highlighted = hljs.highlightAuto(text).value;
          return `<pre><code class="hljs">${highlighted}</code></pre>`;
        }
      },
      breaks: true,
      gfm: true
    });
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      // Highlight any code blocks that weren't processed by marked
      containerRef.current.querySelectorAll('pre code').forEach((block) => {
        if (!block.classList.contains('hljs')) {
          hljs.highlightElement(block as HTMLElement);
        }
      });
    }
  }, [content]);

  const renderMarkdown = (markdown: string) => {
    try {
      return marked(markdown);
    } catch (error) {
      console.error('Markdown parsing failed:', error);
      return `<p>Error rendering markdown: ${error instanceof Error ? error.message : String(error)}</p>`;
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`markdown-renderer ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
};