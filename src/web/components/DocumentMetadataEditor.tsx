import React, { useState, useEffect } from 'react';
import { Document } from '../../shared/types.js';
import './DocumentMetadataEditor.css';

interface DocumentMetadataEditorProps {
  document: Document;
  onUpdate: (metadata: { title: string; tags: string[] }) => void;
  className?: string;
}

export const DocumentMetadataEditor: React.FC<DocumentMetadataEditorProps> = ({
  document,
  onUpdate,
  className = ''
}) => {
  const [title, setTitle] = useState(document.title);
  const [tags, setTags] = useState<string[]>(document.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setTitle(document.title);
    setTags(document.tags || []);
  }, [document]);

  useEffect(() => {
    onUpdate({ title, tags });
  }, [title, tags, onUpdate]);

  const handleAddTag = (tagToAdd: string) => {
    const trimmedTag = tagToAdd.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
    }
    setTagInput('');
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      // Remove last tag if input is empty and backspace is pressed
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };

  return (
    <div className={`document-metadata-editor ${className}`}>
      <div className="metadata-header">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="title-input"
          placeholder="Document title..."
        />
        <button
          className="expand-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse metadata' : 'Expand metadata'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="metadata-content">
          <div className="metadata-section">
            <label className="metadata-label">Tags</label>
            <div className="tags-container">
              <div className="tags-list">
                {tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <button
                      className="tag-remove"
                      onClick={() => removeTag(tag)}
                      title="Remove tag"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  onBlur={() => {
                    if (tagInput.trim()) {
                      handleAddTag(tagInput);
                    }
                  }}
                  className="tag-input"
                  placeholder="Add tag..."
                />
              </div>
              <div className="tags-help">
                Press Enter or comma to add tags
              </div>
            </div>
          </div>

          <div className="metadata-section">
            <label className="metadata-label">Document Info</label>
            <div className="document-info">
              <div className="info-item">
                <span className="info-label">Created:</span>
                <span className="info-value">{formatDate(document.createdAt)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Modified:</span>
                <span className="info-value">{formatDate(document.updatedAt)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">ID:</span>
                <code className="info-value">{document.id}</code>
              </div>
            </div>
          </div>

          {document.metadata && Object.keys(document.metadata).length > 0 && (
            <div className="metadata-section">
              <label className="metadata-label">Additional Metadata</label>
              <div className="additional-metadata">
                {Object.entries(document.metadata).map(([key, value]) => (
                  <div key={key} className="metadata-item">
                    <span className="metadata-key">{key}:</span>
                    <span className="metadata-value">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};