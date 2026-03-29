import React, { useState } from 'react';
import { Document } from '../../shared/types.js';
import './DocumentList.css';

interface DocumentListProps {
  documents: Document[];
  selectedDocument: Document | null;
  onDocumentSelect: (document: Document) => void;
  onDocumentDelete: (id: string) => void;
  isSearchResults?: boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocument,
  onDocumentSelect,
  onDocumentDelete,
  isSearchResults = false
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, documentId: string) => {
    e.stopPropagation();
    if (deleteConfirm === documentId) {
      onDocumentDelete(documentId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(documentId);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="document-list">
      <div className="document-list-header">
        <span className="document-count">
          {isSearchResults ? `${documents.length} results` : `${documents.length} documents`}
        </span>
      </div>
      
      <div className="document-list-content">
        {documents.length === 0 ? (
          <div className="empty-state">
            {isSearchResults ? 'No documents found' : 'No documents yet'}
          </div>
        ) : (
          documents.map((document) => (
            <div
              key={document.id}
              className={`document-item ${selectedDocument?.id === document.id ? 'selected' : ''}`}
              onClick={() => onDocumentSelect(document)}
            >
              <div className="document-item-header">
                <h4 className="document-title">{document.title}</h4>
                <button
                  className={`delete-btn ${deleteConfirm === document.id ? 'confirm' : ''}`}
                  onClick={(e) => handleDeleteClick(e, document.id)}
                  title={deleteConfirm === document.id ? 'Click again to confirm' : 'Delete document'}
                >
                  {deleteConfirm === document.id ? '✓' : '×'}
                </button>
              </div>
              
              <div className="document-preview">
                {truncateContent(document.content)}
              </div>
              
              <div className="document-meta">
                <span className="document-date">
                  {formatDate(document.updatedAt)}
                </span>
                {document.tags && document.tags.length > 0 && (
                  <div className="document-tags">
                    {document.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                      </span>
                    ))}
                    {document.tags.length > 3 && (
                      <span className="tag-more">+{document.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};