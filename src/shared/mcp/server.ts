import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MCPToolRegistry } from './registry';
import { MCPServerConfig, MCPToolContext, MCPServerInfo } from './types';
import { DocumentManager } from '../documents/manager';
import { MCPError, handleMCPError, sanitizeErrorForClient } from './errors';

export class MCPServer {
  private server: Server;
  private registry: MCPToolRegistry;
  private config: MCPServerConfig;
  private context: MCPToolContext;
  private isRunning: boolean = false;

  constructor(config: MCPServerConfig, documentManager: DocumentManager) {
    this.config = config;
    this.registry = new MCPToolRegistry();
    this.context = { documentManager };
    
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.registry.getAllTools()
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.registry.executeTool(name, args || {}, this.context);
        
        return {
          content: [
            {
              type: "text",
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        // Convert to MCP error and sanitize
        const mcpError = MCPError.fromError(error);
        const sanitizedError = sanitizeErrorForClient(mcpError);
        
        // Log the original error for debugging
        console.error(`MCP Tool execution error for '${name}':`, error);
        
        return {
          content: [
            {
              type: "text",
              text: `Error: ${sanitizedError.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('MCP Server is already running');
    }

    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.isRunning = true;
      console.log(`MCP Server '${this.config.name}' started successfully`);
    } catch (error) {
      console.error('Failed to start MCP Server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.server.close();
      this.isRunning = false;
      console.log(`MCP Server '${this.config.name}' stopped`);
    } catch (error) {
      console.error('Error stopping MCP Server:', error);
      throw error;
    }
  }

  getRegistry(): MCPToolRegistry {
    return this.registry;
  }

  getConfig(): MCPServerConfig {
    return { ...this.config };
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }

  updateContext(context: Partial<MCPToolContext>): void {
    this.context = { ...this.context, ...context };
  }

  getServerInfo(): MCPServerInfo {
    return {
      name: this.config.name,
      version: this.config.version,
      url: this.getServerUrl(),
      status: this.isRunning ? 'running' : 'stopped',
      port: this.config.port,
      pid: this.isRunning ? process.pid : undefined
    };
  }

  private getServerUrl(): string {
    const host = this.config.host || 'localhost';
    const port = this.config.port || 3000;
    return `stdio://localhost`; // MCP uses stdio transport, not HTTP
  }
}