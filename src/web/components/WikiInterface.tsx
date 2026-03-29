import React, { useState, useEffect } from 'react';
import { Document, HiveDocsConfig, MarkdownFile, ImportOptions, ImportResult } from '../../shared/types.js';
import { DocumentList } from './DocumentList.js';
import { DocumentEditor } from './DocumentEditor.js';
import { SearchInterface } from './SearchInterface.js';
import { ImportDialog } from './ImportDialog.js';
import { ConfigurationPanel } from './ConfigurationPanel.js';
import { MCPSetupPanel } from './MCPSetupPanel.js';
import './WikiInterface.css';

interface WikiInterfaceProps {
  documents: Document[];
  selectedDocument: Document | null;
  onDocumentSelect: (document: Document) => void;
  onDocumentCreate: (title: string, content: string) => void;
  onDocumentUpdate: (id: string, title: string, content: string) => void;
  onDocumentDelete: (id: string) => void;
  onSearch: (query: string) => void;
  searchResults: Document[];
  isSearching: boolean;
  onImport?: (files: MarkdownFile[], options: ImportOptions) => Promise<ImportResult>;
  onScanWorkspace?: () => Promise<MarkdownFile[]>;
  config?: HiveDocsConfig;
  onConfigUpdate?: (config: Partial<HiveDocsConfig>) => Promise<void>;
  mcpServerPort?: number;
}

export const WikiInterface: React.FC<WikiInterfaceProps> = ({
  documents,
  selectedDocument,
  onDocumentSelect,
  onDocumentCreate,
  onDocumentUpdate,
  onDocumentDelete,
  onSearch,
  searchResults,
  isSearching,
  onImport,
  onScanWorkspace,
  config,
  onConfigUpdate,
  mcpServerPort
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showMCPSetup, setShowMCPSetup] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = Math.max(200, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="wiki-interface">
      <div 
        className="wiki-sidebar" 
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="sidebar-header">
          <h2>Hive Docs</h2>
          <div className="header-actions">
            <button 
              className="action-btn"
              onClick={() => onDocumentCreate('New Document', '')}
              title="Create new document"
            >
              + New
            </button>
            <button 
              className="action-btn secondary"
              onClick={() => setShowImportDialog(true)}
              title="Import markdown files"
            >
              Import
            </button>
            <button 
              className="action-btn secondary"
              onClick={() => setShowConfigPanel(true)}
              title="Configuration"
            >
              ⚙️
            </button>
            <button 
              className="action-btn secondary"
              onClick={() => setShowMCPSetup(true)}
              title="MCP Setup"
            >
              🔗
            </button>
          </div>
        </div>
        
        <SearchInterface 
          onSearch={onSearch}
          isSearching={isSearching}
        />
        
        <DocumentList
          documents={isSearching ? searchResults : documents}
          selectedDocument={selectedDocument}
          onDocumentSelect={onDocumentSelect}
          onDocumentDelete={onDocumentDelete}
          isSearchResults={isSearching}
        />
      </div>
      
      <div 
        className="wiki-resizer"
        onMouseDown={handleMouseDown}
      />
      
      <div className="wiki-main">
        {selectedDocument ? (
          <DocumentEditor
            document={selectedDocument}
            onUpdate={onDocumentUpdate}
          />
        ) : (
          <div className="wiki-welcome">
            <h3>Welcome to Hive Docs</h3>
            <p>Select a document from the sidebar or create a new one to get started.</p>
          </div>
        )}
      </div>
      {showImportDialog && (
        <ImportDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImport={onImport || (async () => ({ imported: 0, skipped: 0, errors: [] }))}
          onScanWorkspace={onScanWorkspace || (async () => [])}
        />
      )}
      {showConfigPanel && config && (
        <ConfigurationPanel
          isOpen={showConfigPanel}
          onClose={() => setShowConfigPanel(false)}
          config={config}
          onConfigUpdate={onConfigUpdate || (async () => {})}
        />
      )}
      {showMCPSetup && (
        <MCPSetupPanel
          isOpen={showMCPSetup}
          onClose={() => setShowMCPSetup(false)}
          serverPort={mcpServerPort || 3000}
        />
      )}
    </div>
  );
};