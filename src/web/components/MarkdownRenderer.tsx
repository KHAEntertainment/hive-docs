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
    // Configure marked with syntax highlighting
    marked.setOptions({
      highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (error) {
            console.warn('Syntax highlighting failed:', error);
          }
        }
        return hljs.highlightAuto(code).value;
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