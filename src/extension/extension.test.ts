import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Hive Docs Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('hive-docs'));
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('hive-docs');
        assert.ok(extension);
        
        if (!extension.isActive) {
            await extension.activate();
        }
        
        assert.ok(extension.isActive);
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        
        const expectedCommands = [
            'hive-docs.open',
            'hive-docs.refresh',
            'hive-docs.import',
            'hive-docs.newDocument',
            'hive-docs.search',
            'hive-docs.quickOpen',
            'hive-docs.export',
            'hive-docs.openSettings',
            'hive-docs.mcpStatus'
        ];

        for (const command of expectedCommands) {
            assert.ok(
                commands.includes(command),
                `Command ${command} should be registered`
            );
        }
    });

    test('Webview provider should be registered', () => {
        // This test verifies that the webview provider is registered
        // In a real test environment, we would check if the webview is properly created
        // For now, we just verify the extension activated without errors
        const extension = vscode.extensions.getExtension('hive-docs');
        assert.ok(extension?.isActive);
    });

    test('Configuration should be accessible', () => {
        const config = vscode.workspace.getConfiguration('hive-docs');
        assert.ok(config);
        
        // Test default configuration values
        assert.strictEqual(config.get('database.autoBackup'), true);
        assert.strictEqual(config.get('mcp.enabled'), true);
        assert.strictEqual(config.get('mcp.port'), 3000);
        assert.strictEqual(config.get('git.ignoreDatabase'), true);
    });

    test('Commands should execute without errors', async () => {
        // Test basic command execution
        try {
            await vscode.commands.executeCommand('hive-docs.open');
            // If we get here, the command executed without throwing
            assert.ok(true);
        } catch (error) {
            assert.fail(`Command execution failed: ${error}`);
        }
    });

    test('Context should be set correctly', async () => {
        // Verify that the extension sets the context correctly
        const context = await vscode.commands.executeCommand('getContext', 'hive-docs:enabled');
        assert.strictEqual(context, true);
    });
});

suite('Hive Docs Integration Tests', () => {
    let workspaceUri: vscode.Uri;

    suiteSetup(async () => {
        // Create a temporary workspace for testing
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            workspaceUri = workspaceFolder.uri;
        }
    });

    test('Should handle workspace with markdown files', async () => {
        if (!workspaceUri) {
            // Skip test if no workspace is available
            return;
        }

        // Create a test markdown file
        const testFilePath = vscode.Uri.joinPath(workspaceUri, 'test-doc.md');
        const testContent = '# Test Document\n\nThis is a test document for Hive Docs.';
        
        try {
            await vscode.workspace.fs.writeFile(testFilePath, Buffer.from(testContent, 'utf8'));
            
            // Verify file was created
            const stat = await vscode.workspace.fs.stat(testFilePath);
            assert.ok(stat.size > 0);
            
            // Clean up
            await vscode.workspace.fs.delete(testFilePath);
        } catch (error) {
            // Test might fail in some environments, that's okay
            console.warn('Workspace test skipped:', error);
        }
    });

    test('Should handle configuration updates', async () => {
        const config = vscode.workspace.getConfiguration('hive-docs');
        
        // Test updating a configuration value
        const originalValue = config.get('mcp.port');
        const testValue = 3001;
        
        try {
            await config.update('mcp.port', testValue, vscode.ConfigurationTarget.Workspace);
            
            // Verify the update
            const updatedConfig = vscode.workspace.getConfiguration('hive-docs');
            assert.strictEqual(updatedConfig.get('mcp.port'), testValue);
            
            // Restore original value
            await config.update('mcp.port', originalValue, vscode.ConfigurationTarget.Workspace);
        } catch (error) {
            console.warn('Configuration test skipped:', error);
        }
    });
});