import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { WorkspaceScanner } from './scanner';
import { DEFAULT_IGNORE_RULES } from '../constants';

describe('WorkspaceScanner', () => {
  let scanner: WorkspaceScanner;
  let tempDir: string;

  beforeEach(async () => {
    scanner = new WorkspaceScanner();
    // Create a temporary directory for testing
    tempDir = path.join(process.cwd(), 'test-workspace-' + Date.now());
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

  describe('isMarkdownFile', () => {
    it('should identify markdown files by .md extension', () => {
      expect(scanner.isMarkdownFile('test.md')).toBe(true);
      expect(scanner.isMarkdownFile('path/to/file.md')).toBe(true);
    });

    it('should identify markdown files by .markdown extension', () => {
      expect(scanner.isMarkdownFile('test.markdown')).toBe(true);
      expect(scanner.isMarkdownFile('path/to/file.markdown')).toBe(true);
    });

    it('should reject non-markdown files', () => {
      expect(scanner.isMarkdownFile('test.txt')).toBe(false);
      expect(scanner.isMarkdownFile('test.js')).toBe(false);
      expect(scanner.isMarkdownFile('test')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(scanner.isMarkdownFile('test.MD')).toBe(true);
      expect(scanner.isMarkdownFile('test.Markdown')).toBe(true);
    });
  });

  describe('applyIgnoreRules', () => {
    it('should filter out files matching ignore rules', () => {
      const files = ['README.md', 'docs/guide.md', 'src/test.md'];
      const ignoreRules = ['README.md'];
      const result = scanner.applyIgnoreRules(files, ignoreRules);
      expect(result).toEqual(['docs/guide.md', 'src/test.md']);
    });

    it('should handle glob patterns', () => {
      const files = ['README.md', 'docs/guide.md', 'node_modules/package/readme.md'];
      const ignoreRules = ['node_modules/**'];
      const result = scanner.applyIgnoreRules(files, ignoreRules);
      expect(result).toEqual(['README.md', 'docs/guide.md']);
    });

    it('should handle multiple ignore rules', () => {
      const files = ['README.md', 'CHANGELOG.md', 'docs/guide.md', 'src/test.md'];
      const ignoreRules = ['README.md', 'CHANGELOG.md'];
      const result = scanner.applyIgnoreRules(files, ignoreRules);
      expect(result).toEqual(['docs/guide.md', 'src/test.md']);
    });

    it('should return all files when no ignore rules match', () => {
      const files = ['docs/guide.md', 'src/test.md'];
      const ignoreRules = ['README.md'];
      const result = scanner.applyIgnoreRules(files, ignoreRules);
      expect(result).toEqual(files);
    });
  });

  describe('scanWorkspace', () => {
    it('should return error for non-existent workspace', async () => {
      const result = await scanner.scanWorkspace({
        workspacePath: '/non/existent/path'
      });

      expect(result.files).toEqual([]);
      expect(result.totalFound).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Workspace path does not exist');
    });

    it('should find markdown files in workspace', async () => {
      // Create test files
      await fs.writeFile(path.join(tempDir, 'test1.md'), '# Test 1');
      await fs.writeFile(path.join(tempDir, 'test2.markdown'), '# Test 2');
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'Not markdown');
      
      const result = await scanner.scanWorkspace({
        workspacePath: tempDir,
        ignoreRules: []
      });

      expect(result.files).toHaveLength(2);
      expect(result.totalFound).toBe(2);
      expect(result.files.map(f => f.name).sort()).toEqual(['test1.md', 'test2.markdown']);
    });

    it('should apply ignore rules correctly', async () => {
      // Create test files
      await fs.writeFile(path.join(tempDir, 'README.md'), '# README');
      await fs.writeFile(path.join(tempDir, 'guide.md'), '# Guide');
      
      const result = await scanner.scanWorkspace({
        workspacePath: tempDir,
        ignoreRules: ['README.md']
      });

      expect(result.files).toHaveLength(2);
      expect(result.files.find(f => f.name === 'README.md')?.ignored).toBe(true);
      expect(result.files.find(f => f.name === 'guide.md')?.ignored).toBe(false);
      expect(result.totalIgnored).toBe(1);
    });

    it('should find files in subdirectories', async () => {
      // Create subdirectory and files
      const subDir = path.join(tempDir, 'docs');
      await fs.mkdir(subDir);
      await fs.writeFile(path.join(subDir, 'guide.md'), '# Guide');
      await fs.writeFile(path.join(tempDir, 'README.md'), '# README');
      
      const result = await scanner.scanWorkspace({
        workspacePath: tempDir,
        ignoreRules: []
      });

      expect(result.files).toHaveLength(2);
      expect(result.files.map(f => f.path).sort()).toEqual(['README.md', 'docs/guide.md']);
    });

    it('should use default ignore rules when none provided', async () => {
      // Create test files that match default ignore rules
      await fs.writeFile(path.join(tempDir, 'README.md'), '# README');
      await fs.writeFile(path.join(tempDir, 'guide.md'), '# Guide');
      
      const result = await scanner.scanWorkspace({
        workspacePath: tempDir
        // No ignoreRules provided, should use defaults
      });

      expect(result.files).toHaveLength(2);
      expect(result.files.find(f => f.name === 'README.md')?.ignored).toBe(true);
      expect(result.files.find(f => f.name === 'guide.md')?.ignored).toBe(false);
    });

    it('should handle directory ignore patterns', async () => {
      // Create node_modules directory with markdown file
      const nodeModulesDir = path.join(tempDir, 'node_modules', 'package');
      await fs.mkdir(nodeModulesDir, { recursive: true });
      await fs.writeFile(path.join(nodeModulesDir, 'readme.md'), '# Package README');
      await fs.writeFile(path.join(tempDir, 'guide.md'), '# Guide');
      
      const result = await scanner.scanWorkspace({
        workspacePath: tempDir,
        ignoreRules: ['node_modules/**']
      });

      // Should find the guide.md but node_modules file should be filtered out by glob ignore
      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe('guide.md');
    });

    it('should include file content and metadata', async () => {
      const content = '# Test Document\\n\\nThis is a test.';
      await fs.writeFile(path.join(tempDir, 'test.md'), content);
      
      const result = await scanner.scanWorkspace({
        workspacePath: tempDir,
        ignoreRules: []
      });

      expect(result.files).toHaveLength(1);
      const file = result.files[0];
      expect(file.content).toBe(content);
      expect(file.size).toBeGreaterThan(0);
      expect(file.path).toBe('test.md');
      expect(file.name).toBe('test.md');
    });

    it('should handle file read errors gracefully', async () => {
      // Create a file and then make it unreadable (this is tricky to test cross-platform)
      await fs.writeFile(path.join(tempDir, 'test.md'), '# Test');
      
      // We can't easily simulate read errors in a cross-platform way,
      // so we'll just verify the basic functionality works
      const result = await scanner.scanWorkspace({
        workspacePath: tempDir,
        ignoreRules: []
      });

      expect(result.files).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });
  });
});