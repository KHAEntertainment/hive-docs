import { MCPServer } from './server.js';
import { MCPServerConfig, MCPServerInfo } from './types.js';
import { DocumentManager } from '../documents/manager.js';
import { registerDocumentTools } from './tools/index.js';

export class MCPServerManager {
  private server: MCPServer | null = null;
  private config: MCPServerConfig;
  private documentManager: DocumentManager;

  constructor(config: MCPServerConfig, documentManager: DocumentManager) {
    this.config = config;
    this.documentManager = documentManager;
  }

  async start(): Promise<void> {
    if (this.server && this.server.isServerRunning()) {
      throw new Error('MCP Server is already running');
    }

    if (!this.config.enabled) {
      throw new Error('MCP Server is disabled in configuration');
    }

    try {
      // Create new server instance
      this.server = new MCPServer(this.config, this.documentManager);
      
      // Register all document tools
      registerDocumentTools(this.server.getRegistry());
      
      // Start the server
      await this.server.start();
      
      console.log(`MCP Server Manager started server '${this.config.name}'`);
    } catch (error) {
      console.error('Failed to start MCP Server:', error);
      this.server = null;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    try {
      await this.server.stop();
      this.server = null;
      console.log('MCP Server Manager stopped server');
    } catch (error) {
      console.error('Error stopping MCP Server:', error);
      throw error;
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  isRunning(): boolean {
    return this.server?.isServerRunning() || false;
  }

  getServerInfo(): MCPServerInfo {
    const baseInfo: MCPServerInfo = {
      name: this.config.name,
      version: this.config.version,
      url: this.getServerUrl(),
      status: this.isRunning() ? 'running' : 'stopped'
    };

    if (this.config.port) {
      baseInfo.port = this.config.port;
    }

    // Add process ID if available
    if (this.isRunning()) {
      baseInfo.pid = process.pid;
    }

    return baseInfo;
  }

  getConfig(): MCPServerConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<MCPServerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getServer(): MCPServer | null {
    return this.server;
  }

  private getServerUrl(): string {
    const host = this.config.host || 'localhost';
    const port = this.config.port || 3000;
    return `http://${host}:${port}`;
  }

  async healthCheck(): Promise<{
    running: boolean;
    config: MCPServerConfig;
    toolCount: number;
    serverInfo: MCPServerInfo;
  }> {
    const running = this.isRunning();
    const toolCount = this.server?.getRegistry().getToolCount() || 0;
    const serverInfo = this.getServerInfo();

    return {
      running,
      config: this.getConfig(),
      toolCount,
      serverInfo
    };
  }
}