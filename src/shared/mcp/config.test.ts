import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPConfigurationManager, CursorMCPConfig, ClaudeDesktopMCPConfig, GenericMCPConfig } from './config.js';
import { MCPServerInfo } from './types.js';
import fs from 'fs/promises';
import path from 'path';

// Mock fs module
vi.mock('fs/promises');

describe('MCP Configuration Tests', () => {
  let serverInfo: MCPServerInfo;
  let configManager: MCPConfigurationManager;

  beforeEach(() => {
    serverInfo = {
      name: 'hive-docs',
      version: '1.0.0',
      url: 'stdio://localhost',
      status: 'running',
      port: 3000,
      pid: 12345
    };

    configManager = new MCPConfigurationManager();
    vi.clearAllMocks();
  });

  describe('CursorMCPConfig', () => {
    let cursorConfig: CursorMCPConfig;

    beforeEach(() => {
      cursorConfig = new CursorMCPConfig();
    });

    it('should generate correct Cursor configuration', () => {
      const config = cursorConfig.generateConfig(serverInfo);

      expect(config.mcpServers['hive-docs']).toBeDefined();
      expect(config.mcpServers['hive-docs'].command).toBe('node');
      expect(config.mcpServers['hive-docs'].args).toContain(path.join(process.cwd(), 'dist', 'mcp-server.js'));
      expect(config.mcpServers['hive-docs'].env?.HIVE_DOCS_PORT).toBe('3000');
      expect(config.mcpServers['hive-docs'].disabled).toBe(false);
      expect(config.mcpServers['hive-docs'].autoApprove).toContain('readDocument');
    });

    it('should generate setup instructions for Cursor', () => {
      const instructions = cursorConfig.getSetupInstructions(serverInfo);

      expect(instructions).toContain('Cursor Setup');
      expect(instructions).toContain('MCP settings');
      expect(instructions).toContain('readDocument');
      expect(instructions).toContain('writeDocument');
      expect(instructions).toContain('searchDocuments');
      expect(instructions).toContain('listDocuments');
    });
  });

  describe('ClaudeDesktopMCPConfig', () => {
    let claudeConfig: ClaudeDesktopMCPConfig;

    beforeEach(() => {
      claudeConfig = new ClaudeDesktopMCPConfig();
    });

    it('should generate correct Claude Desktop configuration', () => {
      const config = claudeConfig.generateConfig(serverInfo);

      expect(config.mcpServers['hive-docs']).toBeDefined();
      expect(config.mcpServers['hive-docs'].command).toBe('node');
      expect(config.mcpServers['hive-docs'].args).toContain(path.join(process.cwd(), 'dist', 'mcp-server.js'));
      expect(config.mcpServers['hive-docs'].env?.HIVE_DOCS_PORT).toBe('3000');
    });

    it('should generate setup instructions for Claude Desktop', () => {
      const instructions = claudeConfig.getSetupInstructions(serverInfo);

      expect(instructions).toContain('Claude Desktop Setup');
      expect(instructions).toContain('claude_desktop_config.json');
      expect(instructions).toContain('mcpServers');
      expect(instructions).toContain('Available Tools');
    });

    it('should handle different platforms for config path', () => {
      const originalPlatform = process.platform;
      
      // Test macOS
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      let instructions = claudeConfig.getSetupInstructions(serverInfo);
      expect(instructions).toContain('Library/Application Support/Claude');
      
      // Test Windows
      Object.defineProperty(process, 'platform', { value: 'win32' });
      instructions = claudeConfig.getSetupInstructions(serverInfo);
      expect(instructions).toContain('Claude');
      
      // Test Linux
      Object.defineProperty(process, 'platform', { value: 'linux' });
      instructions = claudeConfig.getSetupInstructions(serverInfo);
      expect(instructions).toContain('.config/claude');
      
      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('GenericMCPConfig', () => {
    let genericConfig: GenericMCPConfig;

    beforeEach(() => {
      genericConfig = new GenericMCPConfig();
    });

    it('should generate correct generic configuration', () => {
      const config = genericConfig.generateConfig(serverInfo);

      expect(config.mcpServers['hive-docs']).toBeDefined();
      expect(config.mcpServers['hive-docs'].command).toBe('node');
      expect(config.mcpServers['hive-docs'].env?.HIVE_DOCS_PORT).toBe('3000');
    });

    it('should generate setup instructions for generic clients', () => {
      const instructions = genericConfig.getSetupInstructions(serverInfo);

      expect(instructions).toContain('Generic MCP Client Setup');
      expect(instructions).toContain('Gemini CLI, Augment, Kilo-Code');
      expect(instructions).toContain('Configuration Details');
      expect(instructions).toContain('Environment Variables');
    });
  });

  describe('MCPConfigurationManager', () => {
    it('should support all expected clients', () => {
      const supportedClients = configManager.getSupportedClients();
      
      expect(supportedClients).toContain('cursor');
      expect(supportedClients).toContain('claude-desktop');
      expect(supportedClients).toContain('generic');
    });

    it('should generate configuration for supported clients', () => {
      const cursorConfig = configManager.generateConfiguration('cursor', serverInfo);
      const claudeConfig = configManager.generateConfiguration('claude-desktop', serverInfo);
      const genericConfig = configManager.generateConfiguration('generic', serverInfo);

      expect(cursorConfig.mcpServers['hive-docs']).toBeDefined();
      expect(claudeConfig.mcpServers['hive-docs']).toBeDefined();
      expect(genericConfig.mcpServers['hive-docs']).toBeDefined();
    });

    it('should throw error for unsupported clients', () => {
      expect(() => {
        configManager.generateConfiguration('unsupported-client', serverInfo);
      }).toThrow('Unsupported MCP client: unsupported-client');
    });

    it('should get setup instructions for supported clients', () => {
      const cursorInstructions = configManager.getSetupInstructions('cursor', serverInfo);
      const claudeInstructions = configManager.getSetupInstructions('claude-desktop', serverInfo);
      const genericInstructions = configManager.getSetupInstructions('generic', serverInfo);

      expect(cursorInstructions).toContain('Cursor');
      expect(claudeInstructions).toContain('Claude Desktop');
      expect(genericInstructions).toContain('Generic MCP Client');
    });

    it('should save configuration to file', async () => {
      const mockWriteFile = vi.mocked(fs.writeFile);
      mockWriteFile.mockResolvedValue(undefined);

      const outputPath = '/test/path/config.json';
      const savedPath = await configManager.saveConfiguration('cursor', serverInfo, outputPath);

      expect(savedPath).toBe(outputPath);
      expect(mockWriteFile).toHaveBeenCalledWith(
        outputPath,
        expect.stringContaining('"hive-docs"'),
        'utf8'
      );
    });

    it('should save configuration with default filename', async () => {
      const mockWriteFile = vi.mocked(fs.writeFile);
      mockWriteFile.mockResolvedValue(undefined);

      const savedPath = await configManager.saveConfiguration('cursor', serverInfo);

      expect(savedPath).toContain('hive-docs-cursor-config.json');
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('should handle auto-setup for unsupported clients', async () => {
      const result = await configManager.tryAutoSetup('unsupported-client', serverInfo);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Auto-setup not supported');
    });

    it('should handle auto-setup for Cursor', async () => {
      const result = await configManager.tryAutoSetup('cursor', serverInfo);

      expect(result.success).toBe(false);
      expect(result.message).toContain('manual configuration');
    });

    it('should handle auto-setup for Claude Desktop - success case', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      const mockWriteFile = vi.mocked(fs.writeFile);
      const mockMkdir = vi.mocked(fs.mkdir);

      mockReadFile.mockRejectedValue(new Error('File not found'));
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      const result = await configManager.tryAutoSetup('claude-desktop', serverInfo);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully configured Claude Desktop');
      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('should handle auto-setup for Claude Desktop - merge existing config', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      const mockWriteFile = vi.mocked(fs.writeFile);
      const mockMkdir = vi.mocked(fs.mkdir);

      const existingConfig = {
        mcpServers: {
          'other-server': {
            command: 'other-command'
          }
        }
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig));
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      const result = await configManager.tryAutoSetup('claude-desktop', serverInfo);

      expect(result.success).toBe(true);
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"other-server"'),
        'utf8'
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"hive-docs"'),
        'utf8'
      );
    });

    it('should handle auto-setup errors gracefully', async () => {
      const mockWriteFile = vi.mocked(fs.writeFile);
      mockWriteFile.mockRejectedValue(new Error('Permission denied'));

      const result = await configManager.tryAutoSetup('claude-desktop', serverInfo);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to auto-configure');
      expect(result.message).toContain('Permission denied');
    });
  });
});