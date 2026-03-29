import React, { useState } from 'react';
import './MCPSetupPanel.css';

interface MCPSetupPanelProps {
  isOpen: boolean;
  onClose: () => void;
  serverPort: number;
}

interface AgentConfig {
  name: string;
  description: string;
  configType: 'json' | 'command';
  config: string;
  instructions: string[];
}

export const MCPSetupPanel: React.FC<MCPSetupPanelProps> = ({
  isOpen,
  onClose,
  serverPort
}) => {
  const [activeAgent, setActiveAgent] = useState<string>('cursor');

  const agentConfigs: Record<string, AgentConfig> = {
    cursor: {
      name: 'Cursor',
      description: 'AI-powered code editor with built-in MCP support',
      configType: 'json',
      config: JSON.stringify({
        "mcpServers": {
          "hive-docs": {
            "command": "node",
            "args": ["path/to/hive-docs-mcp-server.js"],
            "env": {
              "HIVE_DOCS_PORT": serverPort.toString()
            }
          }
        }
      }, null, 2),
      instructions: [
        'Open Cursor settings (Cmd/Ctrl + ,)',
        'Search for "MCP" in settings',
        'Add the configuration to your MCP servers list',
        'Restart Cursor to apply changes',
        'Hive Docs tools will be available in chat'
      ]
    },
    claude: {
      name: 'Claude Desktop',
      description: 'Anthropic\'s desktop application with MCP integration',
      configType: 'json',
      config: JSON.stringify({
        "mcpServers": {
          "hive-docs": {
            "command": "node",
            "args": ["path/to/hive-docs-mcp-server.js"],
            "env": {
              "HIVE_DOCS_PORT": serverPort.toString()
            }
          }
        }
      }, null, 2),
      instructions: [
        'Locate your Claude Desktop config file:',
        '  • macOS: ~/Library/Application Support/Claude/claude_desktop_config.json',
        '  • Windows: %APPDATA%\\Claude\\claude_desktop_config.json',
        'Add the configuration to the mcpServers section',
        'Restart Claude Desktop',
        'Hive Docs tools will appear in the MCP section'
      ]
    },
    gemini: {
      name: 'Gemini CLI',
      description: 'Google\'s Gemini command-line interface',
      configType: 'command',
      config: `gemini mcp add hive-docs \\
  --command "node path/to/hive-docs-mcp-server.js" \\
  --env HIVE_DOCS_PORT=${serverPort}`,
      instructions: [
        'Install Gemini CLI if not already installed',
        'Run the command above to add Hive Docs MCP server',
        'Start a new Gemini session',
        'Use @hive-docs to access documentation tools'
      ]
    },
    augment: {
      name: 'Augment',
      description: 'AI coding assistant with MCP support',
      configType: 'json',
      config: JSON.stringify({
        "mcp": {
          "servers": {
            "hive-docs": {
              "command": "node",
              "args": ["path/to/hive-docs-mcp-server.js"],
              "env": {
                "HIVE_DOCS_PORT": serverPort.toString()
              }
            }
          }
        }
      }, null, 2),
      instructions: [
        'Open Augment configuration file',
        'Add the MCP server configuration',
        'Restart Augment',
        'Documentation tools will be available in chat'
      ]
    },
    kilo: {
      name: 'Kilo-Code',
      description: 'VS Code extension with MCP integration',
      configType: 'json',
      config: JSON.stringify({
        "kilo.mcp.servers": {
          "hive-docs": {
            "command": "node",
            "args": ["path/to/hive-docs-mcp-server.js"],
            "env": {
              "HIVE_DOCS_PORT": serverPort.toString()
            }
          }
        }
      }, null, 2),
      instructions: [
        'Install Kilo-Code extension in VS Code',
        'Open VS Code settings (JSON)',
        'Add the configuration to your settings.json',
        'Reload VS Code window',
        'Access Hive Docs through Kilo-Code interface'
      ]
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  if (!isOpen) return null;

  const currentConfig = agentConfigs[activeAgent];

  return (
    <div className="mcp-setup-overlay">
      <div className="mcp-setup-panel">
        <div className="mcp-setup-header">
          <h2>MCP Setup Instructions</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="mcp-setup-content">
          <div className="agent-tabs">
            {Object.entries(agentConfigs).map(([key, config]) => (
              <button
                key={key}
                className={`agent-tab ${activeAgent === key ? 'active' : ''}`}
                onClick={() => setActiveAgent(key)}
              >
                <div className="agent-tab-content">
                  <span className="agent-name">{config.name}</span>
                  <span className="agent-description">{config.description}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="setup-instructions">
            <div className="setup-header">
              <h3>Setup for {currentConfig.name}</h3>
              <p className="setup-description">{currentConfig.description}</p>
            </div>

            <div className="config-section">
              <div className="config-header">
                <h4>
                  {currentConfig.configType === 'json' ? 'Configuration' : 'Command'}
                </h4>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(currentConfig.config)}
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </div>
              
              <div className="config-code">
                <pre><code>{currentConfig.config}</code></pre>
              </div>
            </div>

            <div className="instructions-section">
              <h4>Setup Steps</h4>
              <ol className="instructions-list">
                {currentConfig.instructions.map((instruction, index) => (
                  <li key={index} className="instruction-item">
                    {instruction}
                  </li>
                ))}
              </ol>
            </div>

            <div className="server-info">
              <h4>Server Information</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Server Port:</span>
                  <code>{serverPort}</code>
                </div>
                <div className="info-item">
                  <span className="info-label">Status:</span>
                  <span className="status-badge running">Running</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Available Tools:</span>
                  <span>readDocument, writeDocument, searchDocuments, listDocuments</span>
                </div>
              </div>
            </div>

            <div className="troubleshooting">
              <h4>Troubleshooting</h4>
              <div className="troubleshooting-content">
                <div className="troubleshooting-item">
                  <strong>Server not connecting:</strong>
                  <ul>
                    <li>Ensure the MCP server is running (check extension status)</li>
                    <li>Verify the port number matches your configuration</li>
                    <li>Check that no firewall is blocking the connection</li>
                  </ul>
                </div>
                <div className="troubleshooting-item">
                  <strong>Tools not appearing:</strong>
                  <ul>
                    <li>Restart your AI agent after adding the configuration</li>
                    <li>Check the agent's MCP logs for error messages</li>
                    <li>Verify the server path is correct in your configuration</li>
                  </ul>
                </div>
                <div className="troubleshooting-item">
                  <strong>Permission errors:</strong>
                  <ul>
                    <li>Ensure the database file is writable</li>
                    <li>Check that the workspace directory has proper permissions</li>
                    <li>Try running the agent with appropriate privileges</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mcp-setup-footer">
          <div className="footer-info">
            <span className="server-status">
              MCP Server running on port {serverPort}
            </span>
          </div>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};