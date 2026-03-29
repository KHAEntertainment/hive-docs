import { HiveDocsConfig } from '../types';
import { GitIgnoreService } from '../git/service';
import { GitIgnoreError } from '../git/errors';

/**
 * Configuration manager that handles git ignore integration
 */
export class ConfigurationManager {
  private gitIgnoreService: GitIgnoreService;
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.gitIgnoreService = new GitIgnoreService(workspacePath);
  }

  /**
   * Apply git configuration changes
   * @param config The configuration to apply
   * @param previousConfig The previous configuration for comparison
   */
  async applyGitConfiguration(
    config: HiveDocsConfig, 
    previousConfig?: HiveDocsConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if git ignore setting changed
      const gitIgnoreChanged = !previousConfig || 
        config.git.ignoreDatabase !== previousConfig.git.ignoreDatabase;

      if (gitIgnoreChanged) {
        await this.gitIgnoreService.applyGitIgnoreSettings(config.git.ignoreDatabase);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof GitIgnoreError 
        ? error.message 
        : `Failed to apply git configuration: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  /**
   * Validate git configuration before applying
   * @param config The configuration to validate
   */
  async validateGitConfiguration(config: HiveDocsConfig): Promise<{
    valid: boolean;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Check if we can access .gitignore
      const validation = await this.gitIgnoreService.validateGitIgnoreAccess();
      
      if (!validation.canRead || !validation.canWrite) {
        if (config.git.ignoreDatabase) {
          errors.push(validation.error || 'Cannot modify .gitignore file');
        } else {
          warnings.push('Cannot access .gitignore file, but git ignore is disabled');
        }
      }

      // Check if .gitignore exists
      const gitIgnoreExists = await this.gitIgnoreService.gitIgnoreExists();
      if (!gitIgnoreExists && config.git.ignoreDatabase) {
        warnings.push('.gitignore file will be created');
      }

      // Check current status
      const currentStatus = await this.gitIgnoreService.getDatabaseIgnoreStatus();
      if (config.git.ignoreDatabase && currentStatus) {
        warnings.push('Database files are already ignored in .gitignore');
      } else if (!config.git.ignoreDatabase && !currentStatus) {
        warnings.push('Database files are not currently ignored in .gitignore');
      }

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Get current git ignore status for the configuration UI
   */
  async getGitIgnoreStatus(): Promise<{
    enabled: boolean;
    canModify: boolean;
    fileExists: boolean;
    error?: string;
  }> {
    try {
      const info = await this.gitIgnoreService.getGitIgnoreInfo();
      
      return {
        enabled: info.databaseIgnored,
        canModify: info.canModify,
        fileExists: info.exists,
        error: info.error
      };
    } catch (error) {
      return {
        enabled: false,
        canModify: false,
        fileExists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get detailed git ignore information for troubleshooting
   */
  async getGitIgnoreDetails(): Promise<{
    exists: boolean;
    databaseIgnored: boolean;
    patterns: string[];
    canModify: boolean;
    workspacePath: string;
    error?: string;
  }> {
    try {
      const info = await this.gitIgnoreService.getGitIgnoreInfo();
      
      return {
        ...info,
        workspacePath: this.workspacePath
      };
    } catch (error) {
      return {
        exists: false,
        databaseIgnored: false,
        patterns: [],
        canModify: false,
        workspacePath: this.workspacePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}