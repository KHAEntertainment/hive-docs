import React, { useState, useEffect } from 'react';
import { MarkdownFile, ImportOptions, ImportResult } from '../../shared/types.js';
import './ImportDialog.css';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (files: MarkdownFile[], options: ImportOptions) => Promise<ImportResult>;
  onScanWorkspace: () => Promise<MarkdownFile[]>;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  onScanWorkspace
}) => {
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    removeOriginals: false,
    preserveStructure: true,
    tagWithPath: true
  });

  useEffect(() => {
    if (isOpen) {
      handleScanWorkspace();
    } else {
      // Reset state when dialog closes
      setFiles([]);
      setSelectedFiles(new Set());
      setImportResult(null);
    }
  }, [isOpen]);

  const handleScanWorkspace = async () => {
    setIsScanning(true);
    try {
      const scannedFiles = await onScanWorkspace();
      setFiles(scannedFiles);
      
      // Auto-select non-ignored files
      const autoSelected = new Set(
        scannedFiles.filter(f => !f.ignored).map(f => f.path)
      );
      setSelectedFiles(autoSelected);
    } catch (error) {
      console.error('Failed to scan workspace:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileToggle = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    const availableFiles = files.filter(f => !f.ignored);
    setSelectedFiles(new Set(availableFiles.map(f => f.path)));
  };

  const handleSelectNone = () => {
    setSelectedFiles(new Set());
  };

  const handleImport = async () => {
    const filesToImport = files.filter(f => selectedFiles.has(f.path));
    if (filesToImport.length === 0) return;

    setIsImporting(true);
    try {
      const result = await onImport(filesToImport, importOptions);
      setImportResult(result);
    } catch (error) {
      console.error('Failed to import files:', error);
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: ['Import failed: ' + (error instanceof Error ? error.message : String(error))]
      });
    } finally {
      setIsImporting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const selectedCount = selectedFiles.size;
  const availableCount = files.filter(f => !f.ignored).length;
  const ignoredCount = files.filter(f => f.ignored).length;

  if (!isOpen) return null;

  return (
    <div className="import-dialog-overlay">
      <div className="import-dialog">
        <div className="import-dialog-header">
          <h2>Import Markdown Files</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {importResult ? (
          <div className="import-result">
            <h3>Import Complete</h3>
            <div className="result-stats">
              <div className="stat">
                <span className="stat-number">{importResult.imported}</span>
                <span className="stat-label">Imported</span>
              </div>
              <div className="stat">
                <span className="stat-number">{importResult.skipped}</span>
                <span className="stat-label">Skipped</span>
              </div>
              {importResult.errors.length > 0 && (
                <div className="stat error">
                  <span className="stat-number">{importResult.errors.length}</span>
                  <span className="stat-label">Errors</span>
                </div>
              )}
            </div>
            
            {importResult.errors.length > 0 && (
              <div className="error-list">
                <h4>Errors:</h4>
                {importResult.errors.map((error, index) => (
                  <div key={index} className="error-item">{error}</div>
                ))}
              </div>
            )}
            
            <div className="result-actions">
              <button className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="import-dialog-content">
              <div className="scan-section">
                <div className="scan-header">
                  <div className="scan-stats">
                    {isScanning ? (
                      <span>Scanning workspace...</span>
                    ) : (
                      <span>
                        Found {files.length} files ({availableCount} available, {ignoredCount} ignored)
                      </span>
                    )}
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleScanWorkspace}
                    disabled={isScanning}
                  >
                    Rescan
                  </button>
                </div>
              </div>

              <div className="file-selection">
                <div className="selection-header">
                  <div className="selection-stats">
                    {selectedCount} of {availableCount} files selected
                  </div>
                  <div className="selection-actions">
                    <button 
                      className="btn btn-link" 
                      onClick={handleSelectAll}
                      disabled={availableCount === 0}
                    >
                      Select All
                    </button>
                    <button 
                      className="btn btn-link" 
                      onClick={handleSelectNone}
                      disabled={selectedCount === 0}
                    >
                      Select None
                    </button>
                  </div>
                </div>

                <div className="file-list">
                  {files.length === 0 && !isScanning ? (
                    <div className="empty-state">
                      No markdown files found in workspace
                    </div>
                  ) : (
                    files.map((file) => (
                      <div 
                        key={file.path} 
                        className={`file-item ${file.ignored ? 'ignored' : ''}`}
                      >
                        <label className="file-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedFiles.has(file.path)}
                            onChange={() => handleFileToggle(file.path)}
                            disabled={file.ignored}
                          />
                          <span className="checkmark"></span>
                        </label>
                        
                        <div className="file-info">
                          <div className="file-name">{file.name}</div>
                          <div className="file-path">{file.path}</div>
                        </div>
                        
                        <div className="file-meta">
                          <span className="file-size">{formatFileSize(file.size)}</span>
                          {file.ignored && (
                            <span className="ignored-badge">Ignored</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="import-options">
                <h3>Import Options</h3>
                
                <label className="option-checkbox">
                  <input
                    type="checkbox"
                    checked={importOptions.removeOriginals}
                    onChange={(e) => setImportOptions({
                      ...importOptions,
                      removeOriginals: e.target.checked
                    })}
                  />
                  <span className="checkmark"></span>
                  <span className="option-label">
                    Remove original files after import
                    <span className="option-description">
                      Delete the original markdown files from the workspace
                    </span>
                  </span>
                </label>

                <label className="option-checkbox">
                  <input
                    type="checkbox"
                    checked={importOptions.preserveStructure}
                    onChange={(e) => setImportOptions({
                      ...importOptions,
                      preserveStructure: e.target.checked
                    })}
                  />
                  <span className="checkmark"></span>
                  <span className="option-label">
                    Preserve folder structure in titles
                    <span className="option-description">
                      Include folder path in document titles
                    </span>
                  </span>
                </label>

                <label className="option-checkbox">
                  <input
                    type="checkbox"
                    checked={importOptions.tagWithPath}
                    onChange={(e) => setImportOptions({
                      ...importOptions,
                      tagWithPath: e.target.checked
                    })}
                  />
                  <span className="checkmark"></span>
                  <span className="option-label">
                    Tag documents with folder path
                    <span className="option-description">
                      Add folder names as tags for organization
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="import-dialog-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleImport}
                disabled={selectedCount === 0 || isImporting}
              >
                {isImporting ? 'Importing...' : `Import ${selectedCount} files`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};