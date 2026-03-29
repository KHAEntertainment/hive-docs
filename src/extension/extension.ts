import * as vscode from 'vscode';
import * as path from 'path';
import { HiveDocsWebviewProvider } from './webview-provider';
import { DocumentManager } from '@/shared/documents/manager';
import { DatabaseConnection } from '@/shared/database/connection';
import { MCPServerManager } from './mcp-server-manager';
import { ConfigurationManager } from './configuration-manager';

let documentManager: DocumentManager;
let mcpServerManager: MCPServerManager;
let configurationManager: ConfigurationManager;
let databaseConnection: DatabaseConnection;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Hive Docs extension is now active!');

    // Initialize core managers
    configurationManager = new ConfigurationManager(context);
    
    // Initialize database connection
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const dbPath = workspaceFolder 
        ? path.join(workspaceFolder.uri.fsPath, '.hive-docs', 'documents.db')
        : path.join(context.globalStorageUri.fsPath, 'documents.db');
    
    databaseConnection = new DatabaseConnection({ path: dbPath });
    
    // Connect to database
    try {
        await databaseConnection.connect();
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Failed to connect to database:', error);
        vscode.window.showErrorMessage('Hive Docs: Failed to initialize database');
        return;
    }
    
    documentManager = new DocumentManager(databaseConnection);
    mcpServerManager = new MCPServerManager(documentManager);

    // Create webview provider
    const webviewProvider = new HiveDocsWebviewProvider(
        context.extensionUri,
        documentManager,
        configurationManager
    );

    // Register webview provider for bottom panel
    const webviewDisposable = vscode.window.registerWebviewViewProvider(
        'hive-docs.webview',
        webviewProvider,
        {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        }
    );

    // Register commands
    const openCommand = vscode.commands.registerCommand('hive-docs.open', () => {
        // Focus on the webview panel
        vscode.commands.executeCommand('hive-docs.webview.focus');
    });

    const refreshCommand = vscode.commands.registerCommand('hive-docs.refresh', () => {
        webviewProvider.refresh();
    });

    const importCommand = vscode.commands.registerCommand('hive-docs.import', () => {
        webviewProvider.showImportDialog();
    });

    const newDocumentCommand = vscode.commands.registerCommand('hive-docs.newDocument', () => {
        webviewProvider.createNewDocument();
    });

    // Advanced commands
    const searchCommand = vscode.commands.registerCommand('hive-docs.search', async () => {
        const query = await vscode.window.showInputBox({
            prompt: 'Search documents',
            placeHolder: 'Enter search terms...'
        });
        
        if (query) {
            webviewProvider.performSearch(query);
        }
    });

    const quickOpenCommand = vscode.commands.registerCommand('hive-docs.quickOpen', async () => {
        try {
            const documents = await documentManager.listDocuments({ limit: 50 });
            const items = documents.map(doc => ({
                label: doc.title,
                description: doc.content.substring(0, 100) + '...',
                detail: `Modified: ${doc.updatedAt.toLocaleDateString()}`,
                document: doc
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a document to open',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected) {
                webviewProvider.openDocument(selected.document.id);
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to load documents');
        }
    });

    const exportCommand = vscode.commands.registerCommand('hive-docs.export', async () => {
        const options = ['Export All Documents', 'Export Selected Documents'];
        const choice = await vscode.window.showQuickPick(options, {
            placeHolder: 'Choose export option'
        });

        if (choice) {
            webviewProvider.exportDocuments(choice === options[0] ? 'all' : 'selected');
        }
    });

    const configCommand = vscode.commands.registerCommand('hive-docs.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'hive-docs');
    });

    const mcpStatusCommand = vscode.commands.registerCommand('hive-docs.mcpStatus', () => {
        const isRunning = mcpServerManager.isRunning();
        const serverInfo = mcpServerManager.getServerInfo();
        
        if (isRunning && serverInfo) {
            vscode.window.showInformationMessage(
                `MCP Server is running on port ${serverInfo.port}`,
                'Copy Config', 'Stop Server'
            ).then(selection => {
                if (selection === 'Copy Config') {
                    const config = {
                        "mcpServers": {
                            "hive-docs": {
                                "command": "node",
                                "args": ["path/to/hive-docs-mcp-server.js"],
                                "env": {
                                    "HIVE_DOCS_PORT": serverInfo.port?.toString() || "3000"
                                }
                            }
                        }
                    };
                    vscode.env.clipboard.writeText(JSON.stringify(config, null, 2));
                    vscode.window.showInformationMessage('MCP configuration copied to clipboard');
                } else if (selection === 'Stop Server') {
                    mcpServerManager.stop();
                }
            });
        } else {
            vscode.window.showInformationMessage(
                'MCP Server is not running',
                'Start Server'
            ).then(selection => {
                if (selection === 'Start Server') {
                    mcpServerManager.start().catch(error => {
                        vscode.window.showErrorMessage('Failed to start MCP server');
                    });
                }
            });
        }
    });

    // Start MCP server if enabled
    const config = vscode.workspace.getConfiguration('hive-docs');
    if (config.get('mcp.enabled', true)) {
        mcpServerManager.start().catch(error => {
            console.error('Failed to start MCP server:', error);
            vscode.window.showWarningMessage('Hive Docs: Failed to start MCP server for AI agent integration');
        });
    }

    // Add all disposables to context
    context.subscriptions.push(
        webviewDisposable,
        openCommand,
        refreshCommand,
        importCommand,
        newDocumentCommand,
        searchCommand,
        quickOpenCommand,
        exportCommand,
        configCommand,
        mcpStatusCommand
    );

    // Set context for when clause
    vscode.commands.executeCommand('setContext', 'hive-docs:enabled', true);

    console.log('Hive Docs extension activated successfully');
}

export function deactivate() {
    console.log('Hive Docs extension is deactivating...');
    
    // Stop MCP server
    if (mcpServerManager) {
        mcpServerManager.stop().catch(error => {
            console.error('Error stopping MCP server:', error);
        });
    }

    // Close database connections
    if (databaseConnection) {
        databaseConnection.disconnect().catch(error => {
            console.error('Error closing database connection:', error);
        });
    }

    console.log('Hive Docs extension deactivated');
}