import React, { useState, useEffect, useRef } from 'react';
import { Document } from '../../shared/types.js';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { MarkdownEditor } from './MarkdownEditor.js';
import { DocumentMetadataEditor } from './DocumentMetadataEditor.js';
import './DocumentEditor.css';

interface DocumentEditorProps {
  document: Document;
  onUpdate: (id: string, title: string, content: string, tags?: string[]) => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  onUpdate
}) => {
  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content);
  const [tags, setTags] = useState<string[]>(document.tags || []);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Update local state when document changes
  useEffect(() => {
    setTitle(document.title);
    setContent(document.content);
    setTags(document.tags || []);
    setHasUnsavedChanges(false);
  }, [document.id]);

  // Auto-save with debouncing
  useEffect(() => {
    const hasChanges = title !== document.title || 
                      content !== document.content || 
                      JSON.stringify(tags) !== JSON.stringify(document.tags || []);
    setHasUnsavedChanges(hasChanges);

    if (hasChanges) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, tags, document.title, document.content, document.tags]);

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      await onUpdate(document.id, title, content, tags);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMetadataUpdate = ({ title: newTitle, tags: newTags }: { title: string; tags: string[] }) => {
    setTitle(newTitle);
    setTags(newTags);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'p') {
        e.preventDefault();
        setIsPreviewMode(!isPreviewMode);
      }
    }
  };



  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };

  return (
    <div className="document-editor" onKeyDown={handleKeyDown}>
      <DocumentMetadataEditor
        document={document}
        onUpdate={handleMetadataUpdate}
      />
      
      <div className="editor-header">
        <div className="editor-status">
          <span className="editor-date">
            Updated: {formatDate(document.updatedAt)}
          </span>
          {hasUnsavedChanges && (
            <span className="unsaved-indicator">
              {isSaving ? 'Saving...' : 'Unsaved changes'}
            </span>
          )}
        </div>
        
        <div className="editor-toolbar">
          <button
            className={`toolbar-btn ${!isPreviewMode ? 'active' : ''}`}
            onClick={() => setIsPreviewMode(false)}
            title="Edit mode (Ctrl+P to toggle)"
          >
            Edit
          </button>
          <button
            className={`toolbar-btn ${isPreviewMode ? 'active' : ''}`}
            onClick={() => setIsPreviewMode(true)}
            title="Preview mode (Ctrl+P to toggle)"
          >
            Preview
          </button>
          <button
            className="toolbar-btn save-btn"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            title="Save (Ctrl+S)"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      
      <div className="editor-content">
        {isPreviewMode ? (
          <MarkdownRenderer 
            content={content}
            className="editor-preview"
          />
        ) : (
          <MarkdownEditor
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing your document..."
          />
        )}
      </div>
    </div>
  );
};