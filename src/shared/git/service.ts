import { GitIgnoreManager } from './manager';
import { GitIgnoreError } from './errors';

/**
 * Service for managing git ignore functionality with configuration integration
 */
export class GitIgnoreService {
  private gitIgnoreManager: GitIgnoreManager;

  constructor(workspacePath: string) {
    this.gitIgnoreManager = new GitIgnoreManager(workspacePath);
  }

  /**
   * Apply git ignore settings based on configuration
   * @param ignoreDatabase Whether to ignore database files
   * @returns Promise that resolves when settings are applied
   */
  async applyGitIgnoreSettings(ignoreDatabase: boolean): Promise<void> {
    try {
      // Create .gitignore if it doesn't exist and we need to add patterns
      if (ignoreDatabase) {
        await this.gitIgnoreManager.createGitIgnoreIfNeeded();
      }

      // Toggle database ignore patterns
      await this.gitIgnoreManager.toggleDatabaseIgnore(ignoreDatabase);
    } catch (error) {
      if (error instanceof GitIgnoreError) {
        throw error;
      }
      throw new GitIgnoreError(`Failed to apply git ignore settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current git ignore status for database files
   * @returns Promise that resolves to true if database files are ignored
   */
  async getDatabaseIgnoreStatus(): Promise<boolean> {
    try {
      return await this.gitIgnoreManager.getDatabaseIgnoreStatus();
    } catch (error) {
      if (error instanceof GitIgnoreError) {
        throw error;
      }
      throw new GitIgnoreError(`Failed to get git ignore status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if .gitignore file exists
   * @returns Promise that resolves to true if .gitignore exists
   */
  async gitIgnoreExists(): Promise<boolean> {
    return await this.gitIgnoreManager.gitIgnoreExists();
  }

  /**
   * Validate that git ignore operations can be performed
   * @returns Promise that resolves to validation result
   */
  async validateGitIgnoreAccess(): Promise<{ canRead: boolean; canWrite: boolean; error?: string }> {
    try {
      // Test read access
      await this.gitIgnoreManager.readGitIgnore();
      
      // Test write access by attempting to write current content back
      const content = await this.gitIgnoreManager.readGitIgnore();
      await this.gitIgnoreManager.writeGitIgnore(content);
      
      return { canRead: true, canWrite: true };
    } catch (error) {
      if (error instanceof GitIgnoreError) {
        return {
          canRead: false,
          canWrite: false,
          error: error.message
        };
      }
      return {
        canRead: false,
        canWrite: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get information about current .gitignore state
   * @returns Promise that resolves to gitignore information
   */
  async getGitIgnoreInfo(): Promise<{
    exists: boolean;
    databaseIgnored: boolean;
    patterns: string[];
    canModify: boolean;
    error?: string;
  }> {
    try {
      const exists = await this.gitIgnoreManager.gitIgnoreExists();
      const databaseIgnored = await this.gitIgnoreManager.getDatabaseIgnoreStatus();
      
      let patterns: string[] = [];
      let canModify = true;
      let error: string | undefined;

      if (exists) {
        try {
          const content = await this.gitIgnoreManager.readGitIgnore();
          patterns = this.gitIgnoreManager.parseGitIgnoreLines(content);
        } catch (readError) {
          canModify = false;
          error = readError instanceof Error ? readError.message : 'Failed to read .gitignore';
        }
      }

      return {
        exists,
        databaseIgnored,
        patterns,
        canModify,
        error
      };
    } catch (error) {
      return {
        exists: false,
        databaseIgnored: false,
        patterns: [],
        canModify: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}