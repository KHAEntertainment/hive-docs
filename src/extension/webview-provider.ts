import * as vscode from 'vscode';
import * as path from 'path';
import { DocumentManager } from '@/shared/documents/manager';
import { ConfigurationManager } from './configuration-manager';

export class HiveDocsWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'hive-docs.webview';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _documentManager: DocumentManager,
        private readonly _configManager: ConfigurationManager
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            // Restrict the webview to only loading content from our extension's directory
            localResourceRoots: [
                this._extensionUri,
                vscode.Uri.joinPath(this._extensionUri, 'dist'),
                vscode.Uri.joinPath(this._extensionUri, 'public')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            message => this._handleMessage(message),
            undefined,
            []
        );

        // Set up message passing for document operations
        this._setupMessageHandlers();
    }

    public refresh() {
        if (this._view) {
            this._view.webview.postMessage({ type: 'refresh' });
        }
    }

    public showImportDialog() {
        if (this._view) {
            this._view.webview.postMessage({ type: 'showImport' });
        }
    }

    public createNewDocument() {
        if (this._view) {
            this._view.webview.postMessage({ type: 'newDocument' });
        }
    }

    public performSearch(query: string) {
        if (this._view) {
            this._view.webview.postMessage({ 
                type: 'performSearch', 
                data: { query } 
            });
        }
    }

    public openDocument(documentId: string) {
        if (this._view) {
            this._view.webview.postMessage({ 
                type: 'openDocument', 
                data: { id: documentId } 
            });
        }
    }

    public exportDocuments(mode: 'all' | 'selected') {
        if (this._view) {
            this._view.webview.postMessage({ 
                type: 'exportDocuments', 
                data: { mode } 
            });
        }
    }

    private _setupMessageHandlers() {
        // Set up periodic sync of documents
        setInterval(() => {
            this._syncDocuments();
        }, 5000); // Sync every 5 seconds
    }

    private async _syncDocuments() {
        if (!this._view) return;

        try {
            const documents = await this._documentManager.listDocuments();
            this._view.webview.postMessage({
                type: 'documentsSync',
                data: documents
            });
        } catch (error) {
            console.error('Error syncing documents:', error);
        }
    }

    private async _handleMessage(message: any) {
        switch (message.type) {
            case 'ready':
                // Webview is ready, send initial data
                await this._syncDocuments();
                
                // Send initial configuration
                try {
                    const config = await this._configManager.getConfiguration();
                    this._view?.webview.postMessage({
                        type: 'initialConfig',
                        data: config
                    });
                } catch (error) {
                    console.error('Error getting initial configuration:', error);
                }
                break;

            case 'saveState':
                // Save webview state for persistence
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'stateAcknowledged',
                        data: message.data
                    });
                }
                break;

            case 'createDocument':
                try {
                    const document = await this._documentManager.createDocument({
                        title: message.data.title,
                        content: message.data.content
                    });
                    this._view?.webview.postMessage({
                        type: 'documentCreated',
                        data: document
                    });
                } catch (error) {
                    const errorMessage = 'Failed to create document';
                    vscode.window.showErrorMessage(`Hive Docs: ${errorMessage}`);
                    this._view?.webview.postMessage({
                        type: 'error',
                        data: { message: errorMessage, error: (error as Error).message }
                    });
                }
                break;

            case 'updateDocument':
                try {
                    const document = await this._documentManager.updateDocument(message.data.id, {
                        content: message.data.content
                    });
                    this._view?.webview.postMessage({
                        type: 'documentUpdated',
                        data: document
                    });
                } catch (error) {
                    const errorMessage = 'Failed to update document';
                    vscode.window.showErrorMessage(`Hive Docs: ${errorMessage}`);
                    this._view?.webview.postMessage({
                        type: 'error',
                        data: { message: errorMessage, error: (error as Error).message }
                    });
                }
                break;

            case 'deleteDocument':
                try {
                    await this._documentManager.deleteDocument(message.data.id);
                    this._view?.webview.postMessage({
                        type: 'documentDeleted',
                        data: { id: message.data.id }
                    });
                } catch (error) {
                    const errorMessage = 'Failed to delete document';
                    vscode.window.showErrorMessage(`Hive Docs: ${errorMessage}`);
                    this._view?.webview.postMessage({
                        type: 'error',
                        data: { message: errorMessage, error: (error as Error).message }
                    });
                }
                break;

            case 'searchDocuments':
                try {
                    const results = await this._documentManager.searchDocuments({
                        query: message.data.query
                    });
                    this._view?.webview.postMessage({
                        type: 'searchResults',
                        data: results
                    });
                } catch (error) {
                    this._view?.webview.postMessage({
                        type: 'error',
                        data: { message: 'Search failed', error: (error as Error).message }
                    });
                }
                break;

            case 'getConfiguration':
                try {
                    const config = await this._configManager.getConfiguration();
                    const workspaceInfo = {
                        name: vscode.workspace.name,
                        folders: vscode.workspace.workspaceFolders?.map(folder => ({
                            name: folder.name,
                            uri: folder.uri.toString()
                        })) || []
                    };
                    
                    this._view?.webview.postMessage({
                        type: 'configuration',
                        data: { ...config, workspace: workspaceInfo }
                    });
                } catch (error) {
                    this._view?.webview.postMessage({
                        type: 'error',
                        data: { message: 'Failed to get configuration', error: (error as Error).message }
                    });
                }
                break;

            case 'updateConfiguration':
                try {
                    await this._configManager.updateConfiguration(message.data);
                    vscode.window.showInformationMessage('Hive Docs configuration updated');
                    this._view?.webview.postMessage({
                        type: 'configurationUpdated',
                        data: message.data
                    });
                } catch (error) {
                    this._view?.webview.postMessage({
                        type: 'error',
                        data: { message: 'Failed to update configuration', error: (error as Error).message }
                    });
                }
                break;

            case 'openInEditor':
                try {
                    // Create a temporary file with the document content
                    const document = await vscode.workspace.openTextDocument({
                        content: message.data.content,
                        language: 'markdown'
                    });
                    await vscode.window.showTextDocument(document);
                } catch (error) {
                    vscode.window.showErrorMessage('Failed to open document in editor');
                }
                break;

            case 'showMessage':
                // Show VS Code notifications
                const { level, text } = message.data;
                switch (level) {
                    case 'info':
                        vscode.window.showInformationMessage(`Hive Docs: ${text}`);
                        break;
                    case 'warning':
                        vscode.window.showWarningMessage(`Hive Docs: ${text}`);
                        break;
                    case 'error':
                        vscode.window.showErrorMessage(`Hive Docs: ${text}`);
                        break;
                }
                break;

            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'web', 'assets', 'index.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'web', 'assets', 'index.css'));

        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>Hive Docs</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        height: 100vh;
                        overflow: hidden;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        font-weight: var(--vscode-font-weight);
                    }
                    #root {
                        height: 100%;
                        width: 100%;
                    }
                    /* VS Code theme integration */
                    :root {
                        --hive-primary-bg: var(--vscode-editor-background);
                        --hive-secondary-bg: var(--vscode-sideBar-background);
                        --hive-border: var(--vscode-panel-border);
                        --hive-text: var(--vscode-editor-foreground);
                        --hive-text-secondary: var(--vscode-descriptionForeground);
                        --hive-accent: var(--vscode-focusBorder);
                        --hive-button-bg: var(--vscode-button-background);
                        --hive-button-fg: var(--vscode-button-foreground);
                        --hive-button-hover: var(--vscode-button-hoverBackground);
                        --hive-input-bg: var(--vscode-input-background);
                        --hive-input-border: var(--vscode-input-border);
                        --hive-list-hover: var(--vscode-list-hoverBackground);
                        --hive-list-active: var(--vscode-list-activeSelectionBackground);
                    }
                    /* Optimize for bottom panel landscape layout */
                    .landscape-layout {
                        display: flex;
                        flex-direction: row;
                        height: 100%;
                    }
                    .sidebar {
                        width: 300px;
                        min-width: 250px;
                        max-width: 400px;
                        border-right: 1px solid var(--hive-border);
                        background-color: var(--hive-secondary-bg);
                    }
                    .main-content {
                        flex: 1;
                        overflow: hidden;
                        background-color: var(--hive-primary-bg);
                    }
                    /* VS Code scrollbar styling */
                    ::-webkit-scrollbar {
                        width: 10px;
                        height: 10px;
                    }
                    ::-webkit-scrollbar-track {
                        background: var(--vscode-scrollbarSlider-background);
                    }
                    ::-webkit-scrollbar-thumb {
                        background: var(--vscode-scrollbarSlider-background);
                        border-radius: 5px;
                    }
                    ::-webkit-scrollbar-thumb:hover {
                        background: var(--vscode-scrollbarSlider-hoverBackground);
                    }
                    ::-webkit-scrollbar-thumb:active {
                        background: var(--vscode-scrollbarSlider-activeBackground);
                    }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}">
                    // Set up VS Code API for the webview
                    window.vscode = acquireVsCodeApi();
                    
                    // Get VS Code theme information
                    const body = document.body;
                    const computedStyle = getComputedStyle(body);
                    const theme = {
                        kind: body.classList.contains('vscode-dark') ? 'dark' : 
                              body.classList.contains('vscode-high-contrast') ? 'high-contrast' : 'light',
                        colors: {
                            background: computedStyle.getPropertyValue('--vscode-editor-background'),
                            foreground: computedStyle.getPropertyValue('--vscode-editor-foreground'),
                            accent: computedStyle.getPropertyValue('--vscode-focusBorder')
                        }
                    };
                    
                    // Set up message passing
                    window.addEventListener('message', event => {
                        const message = event.data;
                        // Forward messages to React app
                        window.dispatchEvent(new CustomEvent('vscode-message', { detail: message }));
                    });
                    
                    // Helper function to send messages to extension
                    window.sendMessage = (type, data) => {
                        window.vscode.postMessage({ type, data });
                    };
                    
                    // Helper function to get VS Code state
                    window.getVSCodeState = () => {
                        return window.vscode.getState() || {};
                    };
                    
                    // Helper function to set VS Code state
                    window.setVSCodeState = (state) => {
                        window.vscode.setState(state);
                    };
                    
                    // Provide theme information to the app
                    window.vsCodeTheme = theme;
                    
                    // Listen for theme changes
                    const observer = new MutationObserver(() => {
                        const newTheme = {
                            kind: body.classList.contains('vscode-dark') ? 'dark' : 
                                  body.classList.contains('vscode-high-contrast') ? 'high-contrast' : 'light',
                            colors: {
                                background: computedStyle.getPropertyValue('--vscode-editor-background'),
                                foreground: computedStyle.getPropertyValue('--vscode-editor-foreground'),
                                accent: computedStyle.getPropertyValue('--vscode-focusBorder')
                            }
                        };
                        window.vsCodeTheme = newTheme;
                        window.dispatchEvent(new CustomEvent('vscode-theme-changed', { detail: newTheme }));
                    });
                    
                    observer.observe(body, { 
                        attributes: true, 
                        attributeFilter: ['class'] 
                    });
                    
                    // Notify extension that webview is ready
                    window.vscode.postMessage({ type: 'ready' });
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}