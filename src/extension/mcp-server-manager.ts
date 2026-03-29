import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { DocumentManager } from '@/shared/documents/manager';
import { MCPServer } from '@/shared/mcp/server';

export class MCPServerManager {
    private _server?: MCPServer;
    private _serverProcess?: ChildProcess;
    private _isRunning = false;

    constructor(private readonly _documentManager: DocumentManager) {}

    public async start(): Promise<void> {
        if (this._isRunning) {
            return;
        }

        try {
            // Create MCP server instance
            const config = {
                name: 'hive-docs',
                version: '0.1.0',
                port: 3000,
                host: 'localhost',
                enabled: true,
                autoStart: true
            };
            
            this._server = new MCPServer(config, this._documentManager);
            
            // Start the server
            await this._server.start();
            this._isRunning = true;

            console.log('MCP server started successfully');
            
            // Show information message with server details
            const serverInfo = this._server.getServerInfo();
            vscode.window.showInformationMessage(
                `Hive Docs MCP server started on port ${serverInfo.port}`,
                'Copy Config'
            ).then(selection => {
                if (selection === 'Copy Config') {
                    this._copyMCPConfiguration(serverInfo);
                }
            });

        } catch (error) {
            console.error('Failed to start MCP server:', error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        if (!this._isRunning) {
            return;
        }

        try {
            if (this._server) {
                await this._server.stop();
                this._server = undefined;
            }

            if (this._serverProcess) {
                this._serverProcess.kill();
                this._serverProcess = undefined;
            }

            this._isRunning = false;
            console.log('MCP server stopped');

        } catch (error) {
            console.error('Error stopping MCP server:', error);
            throw error;
        }
    }

    public isRunning(): boolean {
        return this._isRunning;
    }

    public getServerInfo() {
        return this._server?.getServerInfo();
    }

    private async _copyMCPConfiguration(serverInfo: any) {
        const config = {
            "mcpServers": {
                "hive-docs": {
                    "command": "node",
                    "args": [serverInfo.scriptPath || "path/to/hive-docs-mcp-server.js"],
                    "env": {
                        "HIVE_DOCS_PORT": serverInfo.port.toString(),
                        "HIVE_DOCS_DB_PATH": serverInfo.dbPath || ""
                    }
                }
            }
        };

        await vscode.env.clipboard.writeText(JSON.stringify(config, null, 2));
        vscode.window.showInformationMessage('MCP configuration copied to clipboard');
    }
}