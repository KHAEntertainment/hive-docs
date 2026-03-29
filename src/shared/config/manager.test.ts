import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigurationManager } from './manager';
import { GitIgnoreService } from '../git/service';
import { GitIgnoreError } from '../git/errors';
import { HiveDocsConfig } from '../types';

// Mock the GitIgnoreService
vi.mock('../git/service', () => ({
  GitIgnoreService: vi.fn()
}));

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  let mockGitIgnoreService: any;
  let mockConfig: HiveDocsConfig;

  beforeEach(() => {
    // Create mock methods
    mockGitIgnoreService = {
      applyGitIgnoreSettings: vi.fn(),
      getDatabaseIgnoreStatus: vi.fn(),
      gitIgnoreExists: vi.fn(),
      validateGitIgnoreAccess: vi.fn(),
      getGitIgnoreInfo: vi.fn()
    };

    // Mock the GitIgnoreService constructor to return our mock
    vi.mocked(GitIgnoreService).mockImplementation(() => mockGitIgnoreService);
    
    configManager = new ConfigurationManager('/test/workspace');
    
    mockConfig = {
      database: {
        path: 'hive-docs.sqlite',
        autoBackup: true
      },
      import: {
        ignoreRules: [],
        defaultIgnoreRules: ['README.md']
      },
      git: {
        ignoreDatabase: true
      },
      mcp: {
        enabled: true,
        port: 3000,
        autoStart: false
      },
      ui: {
        sidebarVisible: true,
        previewMode: 'side'
      }
    };
  });

  describe('applyGitConfiguration', () => {
    it('should apply git ignore settings when changed', async () => {
      mockGitIgnoreService.applyGitIgnoreSettings = vi.fn().mockResolvedValue(undefined);

      const previousConfig = { ...mockConfig, git: { ignoreDatabase: false } };
      const result = await configManager.applyGitConfiguration(mockConfig, previousConfig);

      expect(result.success).toBe(true);
      expect(mockGitIgnoreService.applyGitIgnoreSettings).toHaveBeenCalledWith(true);
    });

    it('should not apply settings when unchanged', async () => {
      mockGitIgnoreService.applyGitIgnoreSettings = vi.fn().mockResolvedValue(undefined);

      const previousConfig = { ...mockConfig };
      const result = await configManager.applyGitConfiguration(mockConfig, previousConfig);

      expect(result.success).toBe(true);
      expect(mockGitIgnoreService.applyGitIgnoreSettings).not.toHaveBeenCalled();
    });

    it('should apply settings when no previous config provided', async () => {
      mockGitIgnoreService.applyGitIgnoreSettings = vi.fn().mockResolvedValue(undefined);

      const result = await configManager.applyGitConfiguration(mockConfig);

      expect(result.success).toBe(true);
      expect(mockGitIgnoreService.applyGitIgnoreSettings).toHaveBeenCalledWith(true);
    });

    it('should handle GitIgnoreError', async () => {
      const error = new GitIgnoreError('Permission denied');
      mockGitIgnoreService.applyGitIgnoreSettings = vi.fn().mockRejectedValue(error);

      const result = await configManager.applyGitConfiguration(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });

    it('should handle general errors', async () => {
      const error = new Error('General error');
      mockGitIgnoreService.applyGitIgnoreSettings = vi.fn().mockRejectedValue(error);

      const result = await configManager.applyGitConfiguration(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to apply git configuration');
    });
  });

  describe('validateGitConfiguration', () => {
    it('should validate successfully with no issues', async () => {
      mockGitIgnoreService.validateGitIgnoreAccess = vi.fn().mockResolvedValue({
        canRead: true,
        canWrite: true
      });
      mockGitIgnoreService.gitIgnoreExists = vi.fn().mockResolvedValue(true);
      mockGitIgnoreService.getDatabaseIgnoreStatus = vi.fn().mockResolvedValue(false);

      const result = await configManager.validateGitConfiguration(mockConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report errors when cannot access .gitignore and git ignore is enabled', async () => {
      mockGitIgnoreService.validateGitIgnoreAccess = vi.fn().mockResolvedValue({
        canRead: false,
        canWrite: false,
        error: 'Permission denied'
      });

      const result = await configManager.validateGitConfiguration(mockConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Permission denied');
    });

    it('should report warnings when cannot access .gitignore but git ignore is disabled', async () => {
      mockGitIgnoreService.validateGitIgnoreAccess = vi.fn().mockResolvedValue({
        canRead: false,
        canWrite: false,
        error: 'Permission denied'
      });

      const disabledConfig = { ...mockConfig, git: { ignoreDatabase: false } };
      const result = await configManager.validateGitConfiguration(disabledConfig);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Cannot access .gitignore file, but git ignore is disabled');
    });

    it('should warn when .gitignore will be created', async () => {
      mockGitIgnoreService.validateGitIgnoreAccess = vi.fn().mockResolvedValue({
        canRead: true,
        canWrite: true
      });
      mockGitIgnoreService.gitIgnoreExists = vi.fn().mockResolvedValue(false);
      mockGitIgnoreService.getDatabaseIgnoreStatus = vi.fn().mockResolvedValue(false);

      const result = await configManager.validateGitConfiguration(mockConfig);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('.gitignore file will be created');
    });

    it('should warn when database files are already ignored', async () => {
      mockGitIgnoreService.validateGitIgnoreAccess = vi.fn().mockResolvedValue({
        canRead: true,
        canWrite: true
      });
      mockGitIgnoreService.gitIgnoreExists = vi.fn().mockResolvedValue(true);
      mockGitIgnoreService.getDatabaseIgnoreStatus = vi.fn().mockResolvedValue(true);

      const result = await configManager.validateGitConfiguration(mockConfig);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Database files are already ignored in .gitignore');
    });

    it('should handle validation errors', async () => {
      mockGitIgnoreService.validateGitIgnoreAccess = vi.fn().mockRejectedValue(new Error('Validation failed'));

      const result = await configManager.validateGitConfiguration(mockConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Validation failed: Validation failed');
    });
  });

  describe('getGitIgnoreStatus', () => {
    it('should return git ignore status', async () => {
      mockGitIgnoreService.getGitIgnoreInfo = vi.fn().mockResolvedValue({
        exists: true,
        databaseIgnored: true,
        patterns: ['*.sqlite'],
        canModify: true
      });

      const status = await configManager.getGitIgnoreStatus();

      expect(status).toEqual({
        enabled: true,
        canModify: true,
        fileExists: true
      });
    });

    it('should handle errors', async () => {
      mockGitIgnoreService.getGitIgnoreInfo = vi.fn().mockRejectedValue(new Error('Failed'));

      const status = await configManager.getGitIgnoreStatus();

      expect(status.enabled).toBe(false);
      expect(status.canModify).toBe(false);
      expect(status.fileExists).toBe(false);
      expect(status.error).toBe('Failed');
    });
  });

  describe('getGitIgnoreDetails', () => {
    it('should return detailed git ignore information', async () => {
      const mockInfo = {
        exists: true,
        databaseIgnored: true,
        patterns: ['*.sqlite', '*.log'],
        canModify: true
      };
      mockGitIgnoreService.getGitIgnoreInfo = vi.fn().mockResolvedValue(mockInfo);

      const details = await configManager.getGitIgnoreDetails();

      expect(details).toEqual({
        ...mockInfo,
        workspacePath: '/test/workspace'
      });
    });

    it('should handle errors in details', async () => {
      mockGitIgnoreService.getGitIgnoreInfo = vi.fn().mockRejectedValue(new Error('Details failed'));

      const details = await configManager.getGitIgnoreDetails();

      expect(details.exists).toBe(false);
      expect(details.workspacePath).toBe('/test/workspace');
      expect(details.error).toBe('Details failed');
    });
  });
});