import * as fs from 'fs/promises';
import * as path from 'path';
import { GitIgnoreReadError, GitIgnoreWriteError, GitIgnorePermissionError } from './errors';

/**
 * Git ignore manager for handling .gitignore file operations
 * Provides utilities to read, modify, and manage .gitignore files
 */
export class GitIgnoreManager {
  private workspacePath: string;
  private gitignorePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.gitignorePath = path.join(workspacePath, '.gitignore');
  }

  /**
   * Read the current .gitignore file content
   * Returns empty string if file doesn't exist
   */
  async readGitIgnore(): Promise<string> {
    try {
      return await fs.readFile(this.gitignorePath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return '';
      }
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new GitIgnorePermissionError(`Permission denied reading .gitignore: ${error.message}`, error);
      }
      throw new GitIgnoreReadError(`Failed to read .gitignore: ${error.message}`, error);
    }
  }

  /**
   * Write content to .gitignore file
   * Creates the file if it doesn't exist
   */
  async writeGitIgnore(content: string): Promise<void> {
    try {
      await fs.writeFile(this.gitignorePath, content, 'utf-8');
    } catch (error: any) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new GitIgnorePermissionError(`Permission denied writing .gitignore: ${error.message}`, error);
      }
      throw new GitIgnoreWriteError(`Failed to write .gitignore: ${error.message}`, error);
    }
  }

  /**
   * Check if .gitignore file exists
   */
  async gitIgnoreExists(): Promise<boolean> {
    try {
      await fs.access(this.gitignorePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parse .gitignore content into lines, filtering out empty lines and comments
   */
  parseGitIgnoreLines(content: string): string[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
  }

  /**
   * Check if a pattern exists in .gitignore
   */
  async hasPattern(pattern: string): Promise<boolean> {
    const content = await this.readGitIgnore();
    const lines = this.parseGitIgnoreLines(content);
    return lines.includes(pattern);
  }

  /**
   * Add patterns to .gitignore if they don't already exist
   */
  async addPatterns(patterns: string[], comment?: string): Promise<void> {
    const content = await this.readGitIgnore();
    const lines = content.split('\n');
    const existingPatterns = this.parseGitIgnoreLines(content);
    
    const newPatterns = patterns.filter(pattern => !existingPatterns.includes(pattern));
    
    if (newPatterns.length === 0) {
      return; // No new patterns to add
    }

    // Add comment if provided
    if (comment) {
      lines.push('');
      lines.push(`# ${comment}`);
    }

    // Add new patterns
    newPatterns.forEach(pattern => {
      lines.push(pattern);
    });

    const newContent = lines.join('\n');
    await this.writeGitIgnore(newContent);
  }

  /**
   * Remove patterns from .gitignore
   */
  async removePatterns(patterns: string[]): Promise<void> {
    const content = await this.readGitIgnore();
    const lines = content.split('\n');
    
    const filteredLines = lines.filter(line => {
      const trimmedLine = line.trim();
      return !patterns.includes(trimmedLine);
    });

    const newContent = filteredLines.join('\n');
    await this.writeGitIgnore(newContent);
  }

  /**
   * Toggle database file patterns in .gitignore
   * Adds or removes patterns based on the enabled flag
   */
  async toggleDatabaseIgnore(enabled: boolean): Promise<void> {
    const databasePatterns = [
      '*.sqlite',
      '*.sqlite-vec',
      '*.sqlite-wal',
      '*.sqlite-shm'
    ];

    if (enabled) {
      await this.addPatterns(databasePatterns, 'Hive Docs database files');
    } else {
      await this.removePatterns(databasePatterns);
    }
  }

  /**
   * Create .gitignore file if it doesn't exist
   */
  async createGitIgnoreIfNeeded(): Promise<boolean> {
    const exists = await this.gitIgnoreExists();
    if (!exists) {
      await this.writeGitIgnore('');
      return true;
    }
    return false;
  }

  /**
   * Get the status of database ignore patterns
   */
  async getDatabaseIgnoreStatus(): Promise<boolean> {
    const databasePatterns = [
      '*.sqlite',
      '*.sqlite-vec',
      '*.sqlite-wal',
      '*.sqlite-shm'
    ];

    // Check if all database patterns are present
    for (const pattern of databasePatterns) {
      if (!(await this.hasPattern(pattern))) {
        return false;
      }
    }
    return true;
  }
}