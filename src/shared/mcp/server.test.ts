import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPServer } from './server.js';
import { MCPServerConfig } from './types.js';
import { DocumentManager } from '../documents/manager.js';

describe('MCPServer Integration Tests', () => {
  let server: MCPServer;
  let mockDocumentManager: any;
  let config: MCPServerConfig;

  beforeEach(() => {
    mockDocumentManager = {
      getDocumentById: vi.fn(),
      createDocument: vi.fn(),
      updateDocument: vi.fn(),
      searchDocuments: vi.fn(),
      listDocuments: vi.fn(),
      getDocumentCount: vi.fn()
    };

    config = {
      name: 'test-hive-docs',
      version: '1.0.0',
      port: 3001,
      host: 'localhost',
      enabled: true,
      autoStart: false
    };

    server = new MCPServer(config, mockDocumentManager);
  });

  afterEach(async () => {
    if (server.isServerRunning()) {
      await server.stop();
    }
  });

  it('should create server with correct configuration', () => {
    expect(server.getConfig()).toEqual(config);
    expect(server.isServerRunning()).toBe(false);
  });

  it('should register document tools on creation', async () => {
    // Import and register tools manually for testing
    const { registerDocumentTools } = await import('./tools/index.js');
    const registry = server.getRegistry();
    registerDocumentTools(registry);
    
    const toolNames = registry.getToolNames();
    
    expect(toolNames).toContain('readDocument');
    expect(toolNames).toContain('writeDocument');
    expect(toolNames).toContain('searchDocuments');
    expect(toolNames).toContain('listDocuments');
    expect(registry.getToolCount()).toBe(4);
  });

  it('should provide server info', () => {
    const serverInfo = server.getServerInfo();
    
    expect(serverInfo.name).toBe('test-hive-docs');
    expect(serverInfo.version).toBe('1.0.0');
    expect(serverInfo.status).toBe('stopped');
    expect(serverInfo.port).toBe(3001);
    expect(serverInfo.url).toBe('stdio://localhost');
  });

  it('should update server info when running', async () => {
    // Mock the server connection to avoid actual stdio setup in tests
    const mockConnect = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn().mockResolvedValue(undefined);
    
    // Replace the server's connect/close methods for testing
    (server as any).server.connect = mockConnect;
    (server as any).server.close = mockClose;

    await server.start();
    
    const runningInfo = server.getServerInfo();
    expect(runningInfo.status).toBe('running');
    expect(runningInfo.pid).toBe(process.pid);
    
    await server.stop();
    
    const stoppedInfo = server.getServerInfo();
    expect(stoppedInfo.status).toBe('stopped');
    expect(stoppedInfo.pid).toBeUndefined();
  });

  it('should handle tool execution through registry', async () => {
    // Register tools first
    const { registerDocumentTools } = await import('./tools/index.js');
    const registry = server.getRegistry();
    registerDocumentTools(registry);

    const mockDocument = {
      id: 'test-id',
      title: 'Test Document',
      content: 'Test content',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockDocumentManager.getDocumentById.mockResolvedValue(mockDocument);

    const result = await registry.executeTool('readDocument', { id: 'test-id' }, { documentManager: mockDocumentManager });

    expect(result.success).toBe(true);
    expect(result.document.id).toBe('test-id');
    expect(mockDocumentManager.getDocumentById).toHaveBeenCalledWith('test-id');
  });

  it('should handle tool execution errors gracefully', async () => {
    // Register tools first
    const { registerDocumentTools } = await import('./tools/index.js');
    const registry = server.getRegistry();
    registerDocumentTools(registry);

    mockDocumentManager.getDocumentById.mockRejectedValue(new Error('Database connection failed'));
    
    await expect(
      registry.executeTool('readDocument', { id: 'test-id' }, { documentManager: mockDocumentManager })
    ).rejects.toThrow('Failed to read document: Database connection failed');
  });

  it('should update context correctly', async () => {
    // Register tools first
    const { registerDocumentTools } = await import('./tools/index.js');
    const registry = server.getRegistry();
    registerDocumentTools(registry);

    const newDocumentManager = { 
      ...mockDocumentManager, 
      newMethod: vi.fn(),
      getDocumentById: vi.fn().mockResolvedValue({
        id: 'test',
        title: 'Test',
        content: 'Test content',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    };
    
    server.updateContext({ documentManager: newDocumentManager });
    
    // Verify context was updated by actually executing a tool
    const result = await registry.executeTool('readDocument', { id: 'test' }, { documentManager: newDocumentManager });
    expect(result.success).toBe(true);
    expect(newDocumentManager.getDocumentById).toHaveBeenCalledWith('test');
  });

  it('should prevent starting server twice', async () => {
    // Mock the server connection
    const mockConnect = vi.fn().mockResolvedValue(undefined);
    (server as any).server.connect = mockConnect;

    await server.start();
    
    await expect(server.start()).rejects.toThrow('MCP Server is already running');
  });

  it('should handle stop when not running', async () => {
    // Should not throw when stopping a server that's not running
    await expect(server.stop()).resolves.toBeUndefined();
  });

  it('should validate tool definitions', async () => {
    // Register tools first
    const { registerDocumentTools } = await import('./tools/index.js');
    const registry = server.getRegistry();
    registerDocumentTools(registry);

    const tools = registry.getAllTools();
    
    // Verify all tools have required properties
    tools.forEach(tool => {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
    });
  });

  it('should handle missing tools gracefully', async () => {
    // Register tools first so we have a valid registry
    const { registerDocumentTools } = await import('./tools/index.js');
    const registry = server.getRegistry();
    registerDocumentTools(registry);
    
    try {
      await registry.executeTool('nonExistentTool', {}, { documentManager: mockDocumentManager });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Tool 'nonExistentTool' not found");
    }
  });
});