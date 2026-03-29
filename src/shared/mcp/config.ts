import { MCPServerConfig, MCPServerInfo } from './types.js';
import path from 'path';
import fs from 'fs/promises';

export interface MCPConfigGenerator {
  generateConfig(serverInfo: MCPServerInfo): MCPClientConfig;
  getSetupInstructions(serverInfo: MCPServerInfo): string;
}

export interface MCPClientConfig {
  mcpServers: {
    [serverName: string]: {
      command: string;
      args?: string[];
      env?: Record<string, string>;
      disabled?: boolean;
      autoApprove?: string[];
    };
  };
}

export class CursorMCPConfig implements MCPConfigGenerator {
  generateConfig(serverInfo: MCPServerInfo): MCPClientConfig {
    return {
      mcpServers: {
        [serverInfo.name]: {
          command: "node",
          args: [this.getServerScriptPath()],
          env: {
            "HIVE_DOCS_PORT": serverInfo.port?.toString() || "3000"
          },
          disabled: false,
          autoApprove: [
            "readDocument",
            "writeDocument", 
            "searchDocuments",
            "listDocuments"
          ]
        }
      }
    };
  }

  getSetupInstructions(serverInfo: MCPServerInfo): string {
    const config = this.generateConfig(serverInfo);
    return `
## Cursor Setup

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Search for "MCP" in settings
3. Add the following configuration to your MCP settings:

\`\`\`json
${JSON.stringify(config, null, 2)}
\`\`\`

4. Restart Cursor to apply the changes
5. The Hive Docs tools should now be available in your AI chat

**Available Tools:**
- \`readDocument\` - Read a document by ID
- \`writeDocument\` - Create or update documents
- \`searchDocuments\` - Search through all documents
- \`listDocuments\` - List documents with filtering
`;
  }

  private getServerScriptPath(): string {
    // This would be the path to the MCP server script
    return path.join(process.cwd(), 'dist', 'mcp-server.js');
  }
}

export class ClaudeDesktopMCPConfig implements MCPConfigGenerator {
  generateConfig(serverInfo: MCPServerInfo): MCPClientConfig {
    return {
      mcpServers: {
        [serverInfo.name]: {
          command: "node",
          args: [this.getServerScriptPath()],
          env: {
            "HIVE_DOCS_PORT": serverInfo.port?.toString() || "3000"
          }
        }
      }
    };
  }

  getSetupInstructions(serverInfo: MCPServerInfo): string {
    const config = this.generateConfig(serverInfo);
    const configPath = this.getConfigPath();
    
    return `
## Claude Desktop Setup

1. Locate your Claude Desktop configuration file at:
   \`${configPath}\`

2. If the file doesn't exist, create it with the following content:
   \`\`\`json
   ${JSON.stringify(config, null, 2)}
   \`\`\`

3. If the file exists, add the server configuration to the existing \`mcpServers\` section:
   \`\`\`json
   "${serverInfo.name}": ${JSON.stringify(config.mcpServers[serverInfo.name], null, 4)}
   \`\`\`

4. Restart Claude Desktop to apply the changes
5. The Hive Docs tools should now be available in your conversations

**Available Tools:**
- \`readDocument\` - Read a document by ID
- \`writeDocument\` - Create or update documents  
- \`searchDocuments\` - Search through all documents
- \`listDocuments\` - List documents with filtering
`;
  }

  private getConfigPath(): string {
    const platform = process.platform;
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    
    switch (platform) {
      case 'darwin': // macOS
        return path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
      case 'win32': // Windows
        return path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
      case 'linux':
        return path.join(homeDir, '.config', 'claude', 'claude_desktop_config.json');
      default:
        return path.join(homeDir, '.claude', 'claude_desktop_config.json');
    }
  }

  private getServerScriptPath(): string {
    return path.join(process.cwd(), 'dist', 'mcp-server.js');
  }
}

export class GenericMCPConfig implements MCPConfigGenerator {
  generateConfig(serverInfo: MCPServerInfo): MCPClientConfig {
    return {
      mcpServers: {
        [serverInfo.name]: {
          command: "node",
          args: [this.getServerScriptPath()],
          env: {
            "HIVE_DOCS_PORT": serverInfo.port?.toString() || "3000"
          }
        }
      }
    };
  }

  getSetupInstructions(serverInfo: MCPServerInfo): string {
    const config = this.generateConfig(serverInfo);
    
    return `
## Generic MCP Client Setup

For other MCP-compatible clients (Gemini CLI, Augment, Kilo-Code, etc.), add the following configuration:

\`\`\`json
${JSON.stringify(config, null, 2)}
\`\`\`

**Configuration Details:**
- **Server Name:** ${serverInfo.name}
- **Command:** node
- **Script Path:** ${this.getServerScriptPath()}
- **Port:** ${serverInfo.port || 3000}

**Available Tools:**
- \`readDocument\` - Read a document by ID
- \`writeDocument\` - Create or update documents
- \`searchDocuments\` - Search through all documents  
- \`listDocuments\` - List documents with filtering

**Environment Variables:**
- \`HIVE_DOCS_PORT\` - Port number for the MCP server (default: 3000)

Refer to your specific MCP client's documentation for exact configuration steps.
`;
  }

  private getServerScriptPath(): string {
    return path.join(process.cwd(), 'dist', 'mcp-server.js');
  }
}

export class MCPConfigurationManager {
  private generators: Map<string, MCPConfigGenerator> = new Map();

  constructor() {
    this.generators.set('cursor', new CursorMCPConfig());
    this.generators.set('claude-desktop', new ClaudeDesktopMCPConfig());
    this.generators.set('generic', new GenericMCPConfig());
  }

  generateConfiguration(client: string, serverInfo: MCPServerInfo): MCPClientConfig {
    const generator = this.generators.get(client);
    if (!generator) {
      throw new Error(`Unsupported MCP client: ${client}`);
    }
    return generator.generateConfig(serverInfo);
  }

  getSetupInstructions(client: string, serverInfo: MCPServerInfo): string {
    const generator = this.generators.get(client);
    if (!generator) {
      throw new Error(`Unsupported MCP client: ${client}`);
    }
    return generator.getSetupInstructions(serverInfo);
  }

  getSupportedClients(): string[] {
    return Array.from(this.generators.keys());
  }

  async saveConfiguration(client: string, serverInfo: MCPServerInfo, outputPath?: string): Promise<string> {
    const config = this.generateConfiguration(client, serverInfo);
    const configJson = JSON.stringify(config, null, 2);
    
    if (outputPath) {
      await fs.writeFile(outputPath, configJson, 'utf8');
      return outputPath;
    }
    
    // Generate default filename
    const filename = `${serverInfo.name}-${client}-config.json`;
    const defaultPath = path.join(process.cwd(), filename);
    await fs.writeFile(defaultPath, configJson, 'utf8');
    return defaultPath;
  }

  async tryAutoSetup(client: string, serverInfo: MCPServerInfo): Promise<{ success: boolean; message: string }> {
    try {
      switch (client) {
        case 'cursor':
          return await this.tryAutoSetupCursor(serverInfo);
        case 'claude-desktop':
          return await this.tryAutoSetupClaudeDesktop(serverInfo);
        default:
          return {
            success: false,
            message: `Auto-setup not supported for ${client}. Please use manual configuration.`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Auto-setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async tryAutoSetupCursor(serverInfo: MCPServerInfo): Promise<{ success: boolean; message: string }> {
    // For Cursor, we would need to modify the settings.json file
    // This is a simplified implementation - in practice, we'd need to handle existing configurations
    const config = this.generateConfiguration('cursor', serverInfo);
    
    return {
      success: false,
      message: 'Cursor auto-setup requires manual configuration. Please follow the setup instructions.'
    };
  }

  private async tryAutoSetupClaudeDesktop(serverInfo: MCPServerInfo): Promise<{ success: boolean; message: string }> {
    const generator = this.generators.get('claude-desktop') as ClaudeDesktopMCPConfig;
    const configPath = (generator as any).getConfigPath();
    
    try {
      const config = this.generateConfiguration('claude-desktop', serverInfo);
      
      // Check if config file exists
      let existingConfig: any = {};
      try {
        const existingContent = await fs.readFile(configPath, 'utf8');
        existingConfig = JSON.parse(existingContent);
      } catch (error) {
        // File doesn't exist or is invalid, start with empty config
      }
      
      // Merge configurations
      if (!existingConfig.mcpServers) {
        existingConfig.mcpServers = {};
      }
      
      existingConfig.mcpServers[serverInfo.name] = config.mcpServers[serverInfo.name];
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      
      // Write updated config
      await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2), 'utf8');
      
      return {
        success: true,
        message: `Successfully configured Claude Desktop at ${configPath}. Please restart Claude Desktop.`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to auto-configure Claude Desktop: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}