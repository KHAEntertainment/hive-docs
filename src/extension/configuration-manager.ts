import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface HiveDocsConfiguration {
    database: {
        path: string;
        autoBackup: boolean;
    };
    import: {
        ignoreRules: string[];
        defaultIgnoreRules: string[];
    };
    git: {
        ignoreDatabase: boolean;
    };
    mcp: {
        enabled: boolean;
        port: number;
        autoStart: boolean;
    };
    ui: {
        sidebarVisible: boolean;
        previewMode: 'side' | 'tab';
    };
}

export class ConfigurationManager {
    private _config: HiveDocsConfiguration;

    constructor(private readonly _context: vscode.ExtensionContext) {
        this._config = this._getDefaultConfiguration();
    }

    public async getConfiguration(): Promise<HiveDocsConfiguration> {
        // Merge VS Code settings with stored configuration
        const vscodeConfig = vscode.workspace.getConfiguration('hive-docs');
        
        return {
            database: {
                path: vscodeConfig.get('database.path', this._getDefaultDatabasePath()),
                autoBackup: vscodeConfig.get('database.autoBackup', true)
            },
            import: {
                ignoreRules: vscodeConfig.get('import.ignoreRules', []),
                defaultIgnoreRules: vscodeConfig.get('import.defaultIgnoreRules', [
                    'README.md',
                    'readme.md',
                    'node_modules/**',
                    '.git/**',
                    'dist/**',
                    'build/**'
                ])
            },
            git: {
                ignoreDatabase: vscodeConfig.get('git.ignoreDatabase', true)
            },
            mcp: {
                enabled: vscodeConfig.get('mcp.enabled', true),
                port: vscodeConfig.get('mcp.port', 3000),
                autoStart: vscodeConfig.get('mcp.autoStart', true)
            },
            ui: {
                sidebarVisible: vscodeConfig.get('ui.sidebarVisible', true),
                previewMode: vscodeConfig.get('ui.previewMode', 'side')
            }
        };
    }

    public async updateConfiguration(updates: Partial<HiveDocsConfiguration>): Promise<void> {
        const config = vscode.workspace.getConfiguration('hive-docs');
        
        // Update VS Code settings
        for (const [section, values] of Object.entries(updates)) {
            if (typeof values === 'object' && values !== null) {
                for (const [key, value] of Object.entries(values)) {
                    await config.update(`${section}.${key}`, value, vscode.ConfigurationTarget.Workspace);
                }
            }
        }

        // Handle git ignore database setting
        if (updates.git?.ignoreDatabase !== undefined) {
            await this._updateGitIgnore(updates.git.ignoreDatabase);
        }
    }

    private _getDefaultConfiguration(): HiveDocsConfiguration {
        return {
            database: {
                path: this._getDefaultDatabasePath(),
                autoBackup: true
            },
            import: {
                ignoreRules: [],
                defaultIgnoreRules: [
                    'README.md',
                    'readme.md',
                    'node_modules/**',
                    '.git/**',
                    'dist/**',
                    'build/**'
                ]
            },
            git: {
                ignoreDatabase: true
            },
            mcp: {
                enabled: true,
                port: 3000,
                autoStart: true
            },
            ui: {
                sidebarVisible: true,
                previewMode: 'side'
            }
        };
    }

    private _getDefaultDatabasePath(): string {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            return path.join(workspaceFolder.uri.fsPath, '.hive-docs', 'documents.db');
        }
        return path.join(this._context.globalStorageUri.fsPath, 'documents.db');
    }

    private async _updateGitIgnore(ignoreDatabase: boolean): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        const gitIgnorePath = path.join(workspaceFolder.uri.fsPath, '.gitignore');
        const hiveDocsPatterns = [
            '.hive-docs/',
            '*.hive-docs.db',
            '*.hive-docs.db-*'
        ];

        try {
            let gitIgnoreContent = '';
            try {
                gitIgnoreContent = await fs.readFile(gitIgnorePath, 'utf8');
            } catch (error) {
                // File doesn't exist, will create it if needed
            }

            const lines = gitIgnoreContent.split('\n');
            const existingPatterns = lines.filter(line => 
                hiveDocsPatterns.some(pattern => line.trim() === pattern)
            );

            if (ignoreDatabase) {
                // Add patterns if they don't exist
                const missingPatterns = hiveDocsPatterns.filter(pattern =>
                    !lines.some(line => line.trim() === pattern)
                );

                if (missingPatterns.length > 0) {
                    const newContent = gitIgnoreContent + 
                        (gitIgnoreContent.endsWith('\n') || gitIgnoreContent === '' ? '' : '\n') +
                        '\n# Hive Docs database files\n' +
                        missingPatterns.join('\n') + '\n';
                    
                    await fs.writeFile(gitIgnorePath, newContent, 'utf8');
                    vscode.window.showInformationMessage('Added Hive Docs database files to .gitignore');
                }
            } else {
                // Remove patterns if they exist
                if (existingPatterns.length > 0) {
                    const filteredLines = lines.filter(line =>
                        !hiveDocsPatterns.some(pattern => line.trim() === pattern) &&
                        line.trim() !== '# Hive Docs database files'
                    );
                    
                    await fs.writeFile(gitIgnorePath, filteredLines.join('\n'), 'utf8');
                    vscode.window.showInformationMessage('Removed Hive Docs database files from .gitignore');
                }
            }
        } catch (error) {
            console.error('Error updating .gitignore:', error);
            vscode.window.showWarningMessage('Failed to update .gitignore file');
        }
    }
}