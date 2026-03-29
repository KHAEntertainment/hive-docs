/**
 * Example usage of the Git Ignore management functionality
 * This demonstrates how the git ignore system would be integrated
 * into the larger Hive Docs application
 */

import { GitIgnoreManager, GitIgnoreService } from './index';
import { ConfigurationManager } from '../config/manager';
import { HiveDocsConfig } from '../types';

/**
 * Example: Basic git ignore operations
 */
export async function basicGitIgnoreExample(workspacePath: string) {
  const gitIgnoreManager = new GitIgnoreManager(workspacePath);

  // Check if .gitignore exists
  const exists = await gitIgnoreManager.gitIgnoreExists();
  console.log(`Git ignore exists: ${exists}`);

  // Get current database ignore status
  const isIgnored = await gitIgnoreManager.getDatabaseIgnoreStatus();
  console.log(`Database files ignored: ${isIgnored}`);

  // Toggle database ignore (enable)
  await gitIgnoreManager.toggleDatabaseIgnore(true);
  console.log('Database ignore enabled');

  // Check status again
  const newStatus = await gitIgnoreManager.getDatabaseIgnoreStatus();
  console.log(`Database files now ignored: ${newStatus}`);
}

/**
 * Example: Using the service layer
 */
export async function serviceLayerExample(workspacePath: string) {
  const gitIgnoreService = new GitIgnoreService(workspacePath);

  // Get comprehensive git ignore information
  const info = await gitIgnoreService.getGitIgnoreInfo();
  console.log('Git ignore info:', info);

  // Validate access before making changes
  const validation = await gitIgnoreService.validateGitIgnoreAccess();
  if (validation.canWrite) {
    await gitIgnoreService.applyGitIgnoreSettings(true);
    console.log('Git ignore settings applied successfully');
  } else {
    console.error('Cannot modify .gitignore:', validation.error);
  }
}

/**
 * Example: Configuration integration
 */
export async function configurationIntegrationExample(workspacePath: string) {
  const configManager = new ConfigurationManager(workspacePath);

  // Example configuration
  const config: HiveDocsConfig = {
    database: {
      path: 'hive-docs.sqlite',
      autoBackup: true
    },
    import: {
      ignoreRules: ['*.tmp', 'temp/**'],
      defaultIgnoreRules: ['README.md', 'node_modules/**']
    },
    git: {
      ignoreDatabase: true  // Enable database file ignoring
    },
    mcp: {
      enabled: true,
      port: 3000,
      autoStart: false
    },
    ui: {
      sidebarVisible: true,
      previewMode: 'side'
    }
  };

  // Validate configuration before applying
  const validation = await configManager.validateGitConfiguration(config);
  if (validation.valid) {
    console.log('Configuration is valid');
    if (validation.warnings.length > 0) {
      console.log('Warnings:', validation.warnings);
    }

    // Apply the configuration
    const result = await configManager.applyGitConfiguration(config);
    if (result.success) {
      console.log('Git configuration applied successfully');
    } else {
      console.error('Failed to apply configuration:', result.error);
    }
  } else {
    console.error('Configuration validation failed:', validation.errors);
  }

  // Get current status for UI display
  const status = await configManager.getGitIgnoreStatus();
  console.log('Current git ignore status:', status);
}

/**
 * Example: Error handling
 */
export async function errorHandlingExample(workspacePath: string) {
  const gitIgnoreService = new GitIgnoreService(workspacePath);

  try {
    await gitIgnoreService.applyGitIgnoreSettings(true);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Git ignore operation failed:', error.message);
      
      // Provide user-friendly error messages
      if (error.message.includes('Permission denied')) {
        console.log('Suggestion: Check file permissions for .gitignore');
      } else if (error.message.includes('ENOENT')) {
        console.log('Suggestion: The workspace directory may not exist');
      }
    }
  }
}

/**
 * Example: Integration with VS Code extension
 */
export async function vscodeIntegrationExample(workspacePath: string) {
  const configManager = new ConfigurationManager(workspacePath);

  // This would be called when the user changes the git ignore setting in the UI
  const handleGitIgnoreToggle = async (enabled: boolean) => {
    const config: Partial<HiveDocsConfig> = {
      git: { ignoreDatabase: enabled }
    };

    // Get current config (this would come from the extension's config system)
    const currentConfig = await getCurrentConfig(); // Hypothetical function
    const newConfig = { ...currentConfig, ...config };

    // Validate and apply
    const validation = await configManager.validateGitConfiguration(newConfig);
    if (!validation.valid) {
      // Show error to user
      showErrorMessage(`Cannot change git ignore setting: ${validation.errors.join(', ')}`);
      return;
    }

    if (validation.warnings.length > 0) {
      // Show warnings to user
      showWarningMessage(`Git ignore changes: ${validation.warnings.join(', ')}`);
    }

    const result = await configManager.applyGitConfiguration(newConfig, currentConfig);
    if (result.success) {
      showInfoMessage('Git ignore settings updated successfully');
    } else {
      showErrorMessage(`Failed to update git ignore settings: ${result.error}`);
    }
  };

  // Example usage
  await handleGitIgnoreToggle(true);
}

// Hypothetical VS Code integration functions
function getCurrentConfig(): Promise<HiveDocsConfig> {
  // This would integrate with VS Code's configuration system
  throw new Error('Not implemented - this is just an example');
}

function showErrorMessage(message: string): void {
  console.error('ERROR:', message);
}

function showWarningMessage(message: string): void {
  console.warn('WARNING:', message);
}

function showInfoMessage(message: string): void {
  console.info('INFO:', message);
}