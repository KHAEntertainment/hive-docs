import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { GitIgnoreService } from './service';
import { GitIgnoreManager } from './manager';

// Mock the GitIgnoreManager
vi.mock('./manager');

describe('GitIgnoreService', () => {
  let tempDir: string;
  let gitIgnoreService: GitIgnoreService;
  let mockGitIgnoreManager: any;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hive-docs-service-test-'));
    gitIgnoreService = new GitIgnoreService(tempDir);
    
    // Get the mocked instance
    mockGitIgnoreManager = vi.mocked(GitIgnoreManager).mock.instances[0];
  });

  afterEach(async () => {
    vi.clearAllMocks();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('applyGitIgnoreSettings', () => {
    it('should create .gitignore and enable database ignore when enabled', async () => {
      mockGitIgnoreManager.createGitIgnoreIfNeeded = vi.fn().mockResolvedValue(true);
      mockGitIgnoreManager.toggleDatabaseIgnore = vi.fn().mockResolvedValue(undefined);

      await gitIgnoreService.applyGitIgnoreSettings(true);

      expect(mockGitIgnoreManager.createGitIgnoreIfNeeded).toHaveBeenCalled();
      expect(mockGitIgnoreManager.toggleDatabaseIgnore).toHaveBeenCalledWith(true);
    });

    it('should disable database ignore when disabled', async () => {
      mockGitIgnoreManager.toggleDatabaseIgnore = vi.fn().mockResolvedValue(undefined);

      await gitIgnoreService.applyGitIgnoreSettings(false);

      expect(mockGitIgnoreManager.createGitIgnoreIfNeeded).not.toHaveBeenCalled();
      expect(mockGitIgnoreManager.toggleDatabaseIgnore).toHaveBeenCalledWith(false);
    });

    it('should handle errors from GitIgnoreManager', async () => {
      const error = new Error('Permission denied');
      mockGitIgnoreManager.toggleDatabaseIgnore = vi.fn().mockRejectedValue(error);

      await expect(gitIgnoreService.applyGitIgnoreSettings(true)).rejects.toThrow('Failed to apply git ignore settings');
    });
  });

  describe('getDatabaseIgnoreStatus', () => {
    it('should return database ignore status', async () => {
      mockGitIgnoreManager.getDatabaseIgnoreStatus = vi.fn().mockResolvedValue(true);

      const status = await gitIgnoreService.getDatabaseIgnoreStatus();

      expect(status).toBe(true);
      expect(mockGitIgnoreManager.getDatabaseIgnoreStatus).toHaveBeenCalled();
    });

    it('should handle errors from GitIgnoreManager', async () => {
      const error = new Error('Read failed');
      mockGitIgnoreManager.getDatabaseIgnoreStatus = vi.fn().mockRejectedValue(error);

      await expect(gitIgnoreService.getDatabaseIgnoreStatus()).rejects.toThrow('Failed to get git ignore status');
    });
  });

  describe('gitIgnoreExists', () => {
    it('should return gitignore existence status', async () => {
      mockGitIgnoreManager.gitIgnoreExists = vi.fn().mockResolvedValue(true);

      const exists = await gitIgnoreService.gitIgnoreExists();

      expect(exists).toBe(true);
      expect(mockGitIgnoreManager.gitIgnoreExists).toHaveBeenCalled();
    });
  });

  describe('validateGitIgnoreAccess', () => {
    it('should return success when read and write operations succeed', async () => {
      mockGitIgnoreManager.readGitIgnore = vi.fn().mockResolvedValue('test content');
      mockGitIgnoreManager.writeGitIgnore = vi.fn().mockResolvedValue(undefined);

      const result = await gitIgnoreService.validateGitIgnoreAccess();

      expect(result).toEqual({
        canRead: true,
        canWrite: true
      });
    });

    it('should return failure when operations fail', async () => {
      const error = new Error('Permission denied');
      mockGitIgnoreManager.readGitIgnore = vi.fn().mockRejectedValue(error);

      const result = await gitIgnoreService.validateGitIgnoreAccess();

      expect(result.canRead).toBe(false);
      expect(result.canWrite).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('getGitIgnoreInfo', () => {
    it('should return complete gitignore information when file exists', async () => {
      mockGitIgnoreManager.gitIgnoreExists = vi.fn().mockResolvedValue(true);
      mockGitIgnoreManager.getDatabaseIgnoreStatus = vi.fn().mockResolvedValue(true);
      mockGitIgnoreManager.readGitIgnore = vi.fn().mockResolvedValue('node_modules/\n*.log\n');
      mockGitIgnoreManager.parseGitIgnoreLines = vi.fn().mockReturnValue(['node_modules/', '*.log']);

      const info = await gitIgnoreService.getGitIgnoreInfo();

      expect(info).toEqual({
        exists: true,
        databaseIgnored: true,
        patterns: ['node_modules/', '*.log'],
        canModify: true
      });
    });

    it('should return basic information when file does not exist', async () => {
      mockGitIgnoreManager.gitIgnoreExists = vi.fn().mockResolvedValue(false);
      mockGitIgnoreManager.getDatabaseIgnoreStatus = vi.fn().mockResolvedValue(false);

      const info = await gitIgnoreService.getGitIgnoreInfo();

      expect(info).toEqual({
        exists: false,
        databaseIgnored: false,
        patterns: [],
        canModify: true
      });
    });

    it('should handle read errors gracefully', async () => {
      mockGitIgnoreManager.gitIgnoreExists = vi.fn().mockResolvedValue(true);
      mockGitIgnoreManager.getDatabaseIgnoreStatus = vi.fn().mockResolvedValue(false);
      mockGitIgnoreManager.readGitIgnore = vi.fn().mockRejectedValue(new Error('Permission denied'));

      const info = await gitIgnoreService.getGitIgnoreInfo();

      expect(info.exists).toBe(true);
      expect(info.canModify).toBe(false);
      expect(info.error).toContain('Permission denied');
    });

    it('should handle general errors', async () => {
      mockGitIgnoreManager.gitIgnoreExists = vi.fn().mockRejectedValue(new Error('General error'));

      const info = await gitIgnoreService.getGitIgnoreInfo();

      expect(info).toEqual({
        exists: false,
        databaseIgnored: false,
        patterns: [],
        canModify: false,
        error: 'General error'
      });
    });
  });
});