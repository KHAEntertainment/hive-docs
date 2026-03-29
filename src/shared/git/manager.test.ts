import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { GitIgnoreManager } from './manager';
import { GitIgnorePermissionError } from './errors';

describe('GitIgnoreManager', () => {
  let tempDir: string;
  let gitIgnoreManager: GitIgnoreManager;
  let gitignorePath: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hive-docs-test-'));
    gitIgnoreManager = new GitIgnoreManager(tempDir);
    gitignorePath = path.join(tempDir, '.gitignore');
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('readGitIgnore', () => {
    it('should return empty string when .gitignore does not exist', async () => {
      const content = await gitIgnoreManager.readGitIgnore();
      expect(content).toBe('');
    });

    it('should return file content when .gitignore exists', async () => {
      const testContent = 'node_modules/\n*.log\n';
      await fs.writeFile(gitignorePath, testContent);
      
      const content = await gitIgnoreManager.readGitIgnore();
      expect(content).toBe(testContent);
    });

    it('should throw error for permission issues', async () => {
      // Create a directory with the same name as .gitignore to cause an error
      await fs.mkdir(gitignorePath);
      
      await expect(gitIgnoreManager.readGitIgnore()).rejects.toThrow('Failed to read .gitignore');
    });
  });

  describe('writeGitIgnore', () => {
    it('should create and write to .gitignore file', async () => {
      const testContent = 'node_modules/\n*.log\n';
      await gitIgnoreManager.writeGitIgnore(testContent);
      
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toBe(testContent);
    });

    it('should overwrite existing .gitignore file', async () => {
      await fs.writeFile(gitignorePath, 'old content');
      
      const newContent = 'new content';
      await gitIgnoreManager.writeGitIgnore(newContent);
      
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toBe(newContent);
    });
  });

  describe('gitIgnoreExists', () => {
    it('should return false when .gitignore does not exist', async () => {
      const exists = await gitIgnoreManager.gitIgnoreExists();
      expect(exists).toBe(false);
    });

    it('should return true when .gitignore exists', async () => {
      await fs.writeFile(gitignorePath, '');
      
      const exists = await gitIgnoreManager.gitIgnoreExists();
      expect(exists).toBe(true);
    });
  });

  describe('parseGitIgnoreLines', () => {
    it('should parse lines and filter out empty lines and comments', () => {
      const content = `
# This is a comment
node_modules/
*.log

# Another comment
dist/

`;
      
      const lines = gitIgnoreManager.parseGitIgnoreLines(content);
      expect(lines).toEqual(['node_modules/', '*.log', 'dist/']);
    });

    it('should handle empty content', () => {
      const lines = gitIgnoreManager.parseGitIgnoreLines('');
      expect(lines).toEqual([]);
    });
  });

  describe('hasPattern', () => {
    beforeEach(async () => {
      const content = `node_modules/
*.log
dist/`;
      await fs.writeFile(gitignorePath, content);
    });

    it('should return true for existing patterns', async () => {
      expect(await gitIgnoreManager.hasPattern('node_modules/')).toBe(true);
      expect(await gitIgnoreManager.hasPattern('*.log')).toBe(true);
    });

    it('should return false for non-existing patterns', async () => {
      expect(await gitIgnoreManager.hasPattern('*.sqlite')).toBe(false);
      expect(await gitIgnoreManager.hasPattern('build/')).toBe(false);
    });
  });

  describe('addPatterns', () => {
    it('should add new patterns to empty .gitignore', async () => {
      await gitIgnoreManager.addPatterns(['*.sqlite', '*.log'], 'Database files');
      
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('# Database files');
      expect(content).toContain('*.sqlite');
      expect(content).toContain('*.log');
    });

    it('should add new patterns to existing .gitignore', async () => {
      await fs.writeFile(gitignorePath, 'node_modules/\n');
      
      await gitIgnoreManager.addPatterns(['*.sqlite'], 'Database files');
      
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('# Database files');
      expect(content).toContain('*.sqlite');
    });

    it('should not add duplicate patterns', async () => {
      await fs.writeFile(gitignorePath, '*.sqlite\n');
      
      await gitIgnoreManager.addPatterns(['*.sqlite', '*.log']);
      
      const content = await fs.readFile(gitignorePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() === '*.sqlite');
      expect(lines).toHaveLength(1);
      expect(content).toContain('*.log');
    });

    it('should handle adding patterns without comment', async () => {
      await gitIgnoreManager.addPatterns(['*.sqlite']);
      
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('*.sqlite');
      expect(content).not.toContain('#');
    });
  });

  describe('removePatterns', () => {
    beforeEach(async () => {
      const content = `node_modules/
*.log
*.sqlite
dist/`;
      await fs.writeFile(gitignorePath, content);
    });

    it('should remove specified patterns', async () => {
      await gitIgnoreManager.removePatterns(['*.sqlite', '*.log']);
      
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).not.toContain('*.sqlite');
      expect(content).not.toContain('*.log');
      expect(content).toContain('node_modules/');
      expect(content).toContain('dist/');
    });

    it('should handle removing non-existing patterns', async () => {
      await gitIgnoreManager.removePatterns(['*.nonexistent']);
      
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('*.log');
      expect(content).toContain('*.sqlite');
    });
  });

  describe('toggleDatabaseIgnore', () => {
    it('should add database patterns when enabled', async () => {
      await gitIgnoreManager.toggleDatabaseIgnore(true);
      
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('*.sqlite');
      expect(content).toContain('*.sqlite-vec');
      expect(content).toContain('*.sqlite-wal');
      expect(content).toContain('*.sqlite-shm');
      expect(content).toContain('# Hive Docs database files');
    });

    it('should remove database patterns when disabled', async () => {
      // First add the patterns
      await gitIgnoreManager.toggleDatabaseIgnore(true);
      
      // Then remove them
      await gitIgnoreManager.toggleDatabaseIgnore(false);
      
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).not.toContain('*.sqlite');
      expect(content).not.toContain('*.sqlite-vec');
      expect(content).not.toContain('*.sqlite-wal');
      expect(content).not.toContain('*.sqlite-shm');
    });

    it('should preserve other patterns when toggling', async () => {
      await fs.writeFile(gitignorePath, 'node_modules/\n*.log\n');
      
      await gitIgnoreManager.toggleDatabaseIgnore(true);
      
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('*.log');
      expect(content).toContain('*.sqlite');
    });
  });

  describe('createGitIgnoreIfNeeded', () => {
    it('should create .gitignore if it does not exist', async () => {
      const created = await gitIgnoreManager.createGitIgnoreIfNeeded();
      
      expect(created).toBe(true);
      expect(await gitIgnoreManager.gitIgnoreExists()).toBe(true);
    });

    it('should not create .gitignore if it already exists', async () => {
      await fs.writeFile(gitignorePath, 'existing content');
      
      const created = await gitIgnoreManager.createGitIgnoreIfNeeded();
      
      expect(created).toBe(false);
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toBe('existing content');
    });
  });

  describe('getDatabaseIgnoreStatus', () => {
    it('should return false when no database patterns exist', async () => {
      await fs.writeFile(gitignorePath, 'node_modules/\n*.log\n');
      
      const status = await gitIgnoreManager.getDatabaseIgnoreStatus();
      expect(status).toBe(false);
    });

    it('should return false when only some database patterns exist', async () => {
      await fs.writeFile(gitignorePath, '*.sqlite\n*.log\n');
      
      const status = await gitIgnoreManager.getDatabaseIgnoreStatus();
      expect(status).toBe(false);
    });

    it('should return true when all database patterns exist', async () => {
      const content = `*.sqlite
*.sqlite-vec
*.sqlite-wal
*.sqlite-shm
node_modules/`;
      await fs.writeFile(gitignorePath, content);
      
      const status = await gitIgnoreManager.getDatabaseIgnoreStatus();
      expect(status).toBe(true);
    });

    it('should return false for empty .gitignore', async () => {
      const status = await gitIgnoreManager.getDatabaseIgnoreStatus();
      expect(status).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle permission errors gracefully', async () => {
      // Create a read-only directory to simulate permission errors
      const readOnlyDir = path.join(tempDir, 'readonly');
      await fs.mkdir(readOnlyDir, { mode: 0o444 });
      
      const readOnlyManager = new GitIgnoreManager(readOnlyDir);
      
      await expect(readOnlyManager.writeGitIgnore('test')).rejects.toThrow('Permission denied writing .gitignore');
    });
  });
});