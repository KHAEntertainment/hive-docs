import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileImportManager, ImportProgress } from './manager';
import { DocumentManager } from '../documents/manager';
import { MarkdownFile, ImportOptions } from '../types';

// Mock the DocumentManager
const mockDocumentManager = {
  createDocument: vi.fn()
} as unknown as DocumentManager;

describe('FileImportManager', () => {
  let importManager: FileImportManager;
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    importManager = new FileImportManager(mockDocumentManager);
    
    // Create a temporary directory for testing
    tempDir = path.join(process.cwd(), 'test-import-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('scanWorkspace', () => {
    it('should delegate to scanner', async () => {
      // Create test files
      await fs.writeFile(path.join(tempDir, 'test.md'), '# Test');
      
      const result = await importManager.scanWorkspace({
        workspacePath: tempDir,
        ignoreRules: []
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe('test.md');
    });
  });

  describe('importFiles', () => {
    it('should import non-ignored files', async () => {
      const files: MarkdownFile[] = [
        {
          path: 'test1.md',
          name: 'test1.md',
          content: '# Test 1\\n\\nContent 1',
          size: 100,
          ignored: false
        },
        {
          path: 'test2.md',
          name: 'test2.md',
          content: '# Test 2\\n\\nContent 2',
          size: 200,
          ignored: true // This should be skipped
        }
      ];

      const options: ImportOptions = {
        removeOriginals: false,
        preserveStructure: false,
        tagWithPath: false
      };

      const result = await importManager.importFiles(files, options);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockDocumentManager.createDocument).toHaveBeenCalledTimes(1);
      expect(mockDocumentManager.createDocument).toHaveBeenCalledWith({
        title: 'Test 1',
        content: '# Test 1\\n\\nContent 1',
        tags: undefined,
        metadata: {
          originalPath: 'test1.md',
          originalSize: 100,
          importedAt: expect.any(String)
        }
      });
    });

    it('should extract title from H1 heading', async () => {
      const files: MarkdownFile[] = [
        {
          path: 'test.md',
          name: 'test.md',
          content: '# Custom Title\\n\\nContent here',
          size: 100,
          ignored: false
        }
      ];

      const options: ImportOptions = {
        removeOriginals: false,
        preserveStructure: false,
        tagWithPath: false
      };

      await importManager.importFiles(files, options);

      expect(mockDocumentManager.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom Title'
        })
      );
    });

    it('should fall back to filename for title when no H1 found', async () => {
      const files: MarkdownFile[] = [
        {
          path: 'my-document.md',
          name: 'my-document.md',
          content: 'Just some content without heading',
          size: 100,
          ignored: false
        }
      ];

      const options: ImportOptions = {
        removeOriginals: false,
        preserveStructure: false,
        tagWithPath: false
      };

      await importManager.importFiles(files, options);

      expect(mockDocumentManager.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'my-document'
        })
      );
    });

    it('should add path-based tags when tagWithPath is true', async () => {
      const files: MarkdownFile[] = [
        {
          path: 'docs/guides/setup.md',
          name: 'setup.md',
          content: '# Setup Guide',
          size: 100,
          ignored: false
        }
      ];

      const options: ImportOptions = {
        removeOriginals: false,
        preserveStructure: false,
        tagWithPath: true
      };

      await importManager.importFiles(files, options);

      expect(mockDocumentManager.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['docs', 'guides']
        })
      );
    });

    it('should preserve structure metadata when preserveStructure is true', async () => {
      const files: MarkdownFile[] = [
        {
          path: 'docs/api.md',
          name: 'api.md',
          content: '# API Documentation',
          size: 100,
          ignored: false
        }
      ];

      const options: ImportOptions = {
        removeOriginals: false,
        preserveStructure: true,
        tagWithPath: false
      };

      await importManager.importFiles(files, options);

      expect(mockDocumentManager.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            originalDirectory: 'docs'
          })
        })
      );
    });

    it('should call progress callback during import', async () => {
      const files: MarkdownFile[] = [
        {
          path: 'test1.md',
          name: 'test1.md',
          content: '# Test 1',
          size: 100,
          ignored: false
        },
        {
          path: 'test2.md',
          name: 'test2.md',
          content: '# Test 2',
          size: 200,
          ignored: false
        }
      ];

      const options: ImportOptions = {
        removeOriginals: false,
        preserveStructure: false,
        tagWithPath: false
      };

      const progressUpdates: ImportProgress[] = [];
      const progressCallback = (progress: ImportProgress) => {
        progressUpdates.push({ ...progress });
      };

      await importManager.importFiles(files, options, progressCallback);

      expect(progressUpdates).toHaveLength(4); // Start + 2 files + complete
      expect(progressUpdates[0]).toMatchObject({
        current: 0,
        total: 2,
        status: 'importing'
      });
      expect(progressUpdates[1]).toMatchObject({
        current: 1,
        total: 2,
        currentFile: 'test1.md',
        status: 'importing'
      });
      expect(progressUpdates[2]).toMatchObject({
        current: 2,
        total: 2,
        currentFile: 'test2.md',
        status: 'importing'
      });
      expect(progressUpdates[3]).toMatchObject({
        current: 2,
        total: 2,
        status: 'complete'
      });
    });

    it('should handle import errors gracefully', async () => {
      // Mock createDocument to throw an error
      vi.mocked(mockDocumentManager.createDocument).mockRejectedValueOnce(new Error('Database error'));

      const files: MarkdownFile[] = [
        {
          path: 'test.md',
          name: 'test.md',
          content: '# Test',
          size: 100,
          ignored: false
        }
      ];

      const options: ImportOptions = {
        removeOriginals: false,
        preserveStructure: false,
        tagWithPath: false
      };

      const result = await importManager.importFiles(files, options);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Database error');
    });

    it('should skip all files when all are ignored', async () => {
      const files: MarkdownFile[] = [
        {
          path: 'README.md',
          name: 'README.md',
          content: '# README',
          size: 100,
          ignored: true
        }
      ];

      const options: ImportOptions = {
        removeOriginals: false,
        preserveStructure: false,
        tagWithPath: false
      };

      const result = await importManager.importFiles(files, options);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockDocumentManager.createDocument).not.toHaveBeenCalled();
    });

    it('should remove original files when removeOriginals is true', async () => {
      // Create actual test files
      const testFile = path.join(tempDir, 'test.md');
      await fs.writeFile(testFile, '# Test Content');

      const files: MarkdownFile[] = [
        {
          path: testFile,
          name: 'test.md',
          content: '# Test Content',
          size: 100,
          ignored: false
        }
      ];

      const options: ImportOptions = {
        removeOriginals: true,
        preserveStructure: false,
        tagWithPath: false
      };

      // Verify file exists before import
      await expect(fs.access(testFile)).resolves.toBeUndefined();

      await importManager.importFiles(files, options);

      // Verify file was removed after import
      await expect(fs.access(testFile)).rejects.toThrow();
    });
  });

  describe('validateImportOptions', () => {
    it('should return empty array for valid options', () => {
      const options: ImportOptions = {
        removeOriginals: false,
        preserveStructure: true,
        tagWithPath: true
      };

      const errors = importManager.validateImportOptions(options);
      expect(errors).toHaveLength(0);
    });
  });

  describe('getImportStats', () => {
    it('should calculate correct statistics', () => {
      const files: MarkdownFile[] = [
        {
          path: 'test1.md',
          name: 'test1.md',
          content: 'content',
          size: 100,
          ignored: false
        },
        {
          path: 'test2.md',
          name: 'test2.md',
          content: 'content',
          size: 200,
          ignored: true
        },
        {
          path: 'test3.md',
          name: 'test3.md',
          content: 'content',
          size: 150,
          ignored: false
        }
      ];

      const stats = importManager.getImportStats(files);

      expect(stats).toEqual({
        totalFiles: 3,
        totalSize: 450,
        ignoredFiles: 1,
        importableFiles: 2
      });
    });

    it('should handle empty file list', () => {
      const stats = importManager.getImportStats([]);

      expect(stats).toEqual({
        totalFiles: 0,
        totalSize: 0,
        ignoredFiles: 0,
        importableFiles: 0
      });
    });
  });
});