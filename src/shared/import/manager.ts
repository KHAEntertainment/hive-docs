import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentManager } from '../documents/manager';
import { MarkdownFile, ImportOptions, ImportResult } from '../types';
import { WorkspaceScanner } from './scanner';
import { ScanOptions } from './types';

export interface ImportProgress {
  current: number;
  total: number;
  currentFile: string;
  status: 'scanning' | 'importing' | 'cleaning' | 'complete' | 'error';
}

export type ProgressCallback = (progress: ImportProgress) => void;

export class FileImportManager {
  private scanner: WorkspaceScanner;
  private documentManager: DocumentManager;

  constructor(documentManager: DocumentManager) {
    this.documentManager = documentManager;
    this.scanner = new WorkspaceScanner();
  }

  /**
   * Scans workspace for markdown files
   */
  async scanWorkspace(options: ScanOptions) {
    return this.scanner.scanWorkspace(options);
  }

  /**
   * Imports selected markdown files into the document database
   */
  async importFiles(
    files: MarkdownFile[], 
    options: ImportOptions,
    progressCallback?: ProgressCallback
  ): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    // Filter out ignored files
    const filesToImport = files.filter(f => !f.ignored);
    const total = filesToImport.length;

    if (total === 0) {
      progressCallback?.({
        current: 0,
        total: 0,
        currentFile: '',
        status: 'complete'
      });
      return result;
    }

    progressCallback?.({
      current: 0,
      total,
      currentFile: '',
      status: 'importing'
    });

    // Import each file
    for (let i = 0; i < filesToImport.length; i++) {
      const file = filesToImport[i];
      
      progressCallback?.({
        current: i + 1,
        total,
        currentFile: file.name,
        status: 'importing'
      });

      try {
        await this.importSingleFile(file, options);
        result.imported++;
      } catch (error) {
        result.errors.push(`Failed to import ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.skipped++;
      }
    }

    // Clean up original files if requested
    if (options.removeOriginals && result.imported > 0) {
      progressCallback?.({
        current: total,
        total,
        currentFile: '',
        status: 'cleaning'
      });

      await this.cleanupOriginalFiles(filesToImport, result);
    }

    progressCallback?.({
      current: total,
      total,
      currentFile: '',
      status: 'complete'
    });

    return result;
  }

  /**
   * Imports a single markdown file
   */
  private async importSingleFile(file: MarkdownFile, options: ImportOptions): Promise<void> {
    // Extract title from filename or content
    const title = this.extractTitle(file);
    
    // Prepare tags
    const tags: string[] = [];
    if (options.tagWithPath) {
      // Add path-based tags
      const pathParts = path.dirname(file.path).split(path.sep).filter(part => part !== '.');
      tags.push(...pathParts);
    }

    // Prepare metadata
    const metadata: Record<string, any> = {
      originalPath: file.path,
      originalSize: file.size,
      importedAt: new Date().toISOString()
    };

    if (options.preserveStructure) {
      metadata.originalDirectory = path.dirname(file.path);
    }

    // Create document
    await this.documentManager.createDocument({
      title,
      content: file.content,
      tags: tags.length > 0 ? tags : undefined,
      metadata
    });
  }

  /**
   * Extracts title from markdown file
   */
  private extractTitle(file: MarkdownFile): string {
    // Try to extract title from first H1 heading
    const lines = file.content.split('\\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }

    // Fall back to filename without extension
    return path.basename(file.name, path.extname(file.name));
  }

  /**
   * Removes original files after successful import
   */
  private async cleanupOriginalFiles(files: MarkdownFile[], result: ImportResult): Promise<void> {
    for (const file of files) {
      try {
        // Only remove files that were successfully imported
        // We need to check if this specific file was imported successfully
        // For now, we'll be conservative and only remove if no errors occurred for this file
        const hasError = result.errors.some(error => error.includes(file.path));
        
        if (!hasError) {
          await fs.unlink(file.path);
        }
      } catch (error) {
        result.errors.push(`Failed to remove original file ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Validates import options
   */
  validateImportOptions(options: ImportOptions): string[] {
    const errors: string[] = [];

    // Add any validation logic here
    // For now, all options are valid

    return errors;
  }

  /**
   * Gets import statistics for a set of files
   */
  getImportStats(files: MarkdownFile[]): {
    totalFiles: number;
    totalSize: number;
    ignoredFiles: number;
    importableFiles: number;
  } {
    const totalFiles = files.length;
    const ignoredFiles = files.filter(f => f.ignored).length;
    const importableFiles = totalFiles - ignoredFiles;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    return {
      totalFiles,
      totalSize,
      ignoredFiles,
      importableFiles
    };
  }
}