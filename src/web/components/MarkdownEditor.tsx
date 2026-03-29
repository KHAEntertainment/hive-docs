import React, { useState, useRef, useCallback } from 'react';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Start writing your document...",
  className = ''
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  const handleSelectionChange = useCallback(() => {
    if (textareaRef.current) {
      setSelectionStart(textareaRef.current.selectionStart);
      setSelectionEnd(textareaRef.current.selectionEnd);
    }
  }, []);

  const insertText = useCallback((before: string, after: string = '', placeholder: string = '') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newText = value.substring(0, start) + before + textToInsert + after + value.substring(end);
    onChange(newText);

    // Set cursor position after insertion
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = start + before.length + textToInsert.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  }, [value, onChange]);

  const insertAtLineStart = useCallback((prefix: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const lines = value.split('\n');
    let currentPos = 0;
    let lineIndex = 0;

    // Find which line the cursor is on
    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= start) {
        lineIndex = i;
        break;
      }
      currentPos += lines[i].length + 1; // +1 for newline
    }

    // Insert prefix at the beginning of the line
    lines[lineIndex] = prefix + lines[lineIndex];
    const newText = lines.join('\n');
    onChange(newText);

    // Adjust cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = start + prefix.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  }, [value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertText('**', '**', 'bold text');
          break;
        case 'i':
          e.preventDefault();
          insertText('*', '*', 'italic text');
          break;
        case 'k':
          e.preventDefault();
          insertText('[', '](url)', 'link text');
          break;
        case '`':
          e.preventDefault();
          insertText('`', '`', 'code');
          break;
      }
    }

    // Handle Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      insertText('  '); // Insert 2 spaces
    }

    // Handle Enter for list continuation
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPos);
      const currentLine = textBeforeCursor.split('\n').pop() || '';
      
      // Check for list patterns
      const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/);
      if (listMatch) {
        e.preventDefault();
        const indent = listMatch[1];
        const listMarker = listMatch[2];
        
        // If the line only contains the list marker, remove it
        if (currentLine.trim() === listMatch[0].trim()) {
          // Remove the current list marker
          const newValue = value.substring(0, cursorPos - currentLine.length) + 
                          indent + value.substring(cursorPos);
          onChange(newValue);
          
          setTimeout(() => {
            if (textareaRef.current) {
              const newPos = cursorPos - currentLine.length + indent.length;
              textareaRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
        } else {
          // Continue the list
          let nextMarker = listMarker;
          if (/^\d+\./.test(listMarker)) {
            const num = parseInt(listMarker) + 1;
            nextMarker = `${num}.`;
          }
          
          const newText = `\n${indent}${nextMarker} `;
          insertText(newText);
        }
      }
    }
  }, [value, insertText]);

  const formatBold = () => insertText('**', '**', 'bold text');
  const formatItalic = () => insertText('*', '*', 'italic text');
  const formatCode = () => insertText('`', '`', 'code');
  const formatLink = () => insertText('[', '](url)', 'link text');
  const formatHeading1 = () => insertAtLineStart('# ');
  const formatHeading2 = () => insertAtLineStart('## ');
  const formatHeading3 = () => insertAtLineStart('### ');
  const formatList = () => insertAtLineStart('- ');
  const formatNumberedList = () => insertAtLineStart('1. ');
  const formatQuote = () => insertAtLineStart('> ');
  const formatCodeBlock = () => insertText('\n```\n', '\n```\n', 'code block');

  return (
    <div className={`markdown-editor ${className}`}>
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={formatBold}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={formatItalic}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={formatCode}
            title="Inline Code (Ctrl+`)"
          >
            &lt;/&gt;
          </button>
        </div>

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={formatHeading1}
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={formatHeading2}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={formatHeading3}
            title="Heading 3"
          >
            H3
          </button>
        </div>

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={formatList}
            title="Bullet List"
          >
            • List
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={formatNumberedList}
            title="Numbered List"
          >
            1. List
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={formatQuote}
            title="Quote"
          >
            " Quote
          </button>
        </div>

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={formatLink}
            title="Link (Ctrl+K)"
          >
            🔗 Link
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={formatCodeBlock}
            title="Code Block"
          >
            { } Code
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onClick={handleSelectionChange}
        placeholder={placeholder}
        className="editor-textarea"
        spellCheck={true}
      />
    </div>
  );
};