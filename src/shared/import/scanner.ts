import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { MarkdownFile } from '../types';
import { DEFAULT_IGNORE_RULES } from '../constants';
import { FileScanner, ScanOptions, ScanResult } from './types';

export class WorkspaceScanner implements FileScanner {
  /**
   * Scans the workspace for markdown files
   */
  async scanWorkspace(options: ScanOptions): Promise<ScanResult> {
    const { workspacePath, ignoreRules = DEFAULT_IGNORE_RULES, includeHidden = false } = options;
    
    try {
      // Verify workspace path exists
      await fs.access(workspacePath);
    } catch (error) {
      return {
        files: [],
        totalFound: 0,
        totalIgnored: 0,
        errors: [`Workspace path does not exist: ${workspacePath}`]
      };
    }

    const errors: string[] = [];
    const allFiles: MarkdownFile[] = [];

    try {
      // Find all markdown files using glob
      const globPattern = includeHidden ? '**/*.{md,markdown}' : '**/[!.]*.{md,markdown}';
      const foundFiles = await glob(globPattern, {
        cwd: workspacePath,
        absolute: true,
        ignore: ['node_modules/**', '.git/**'] // Always ignore these
      });

      // Process each file
      for (const filePath of foundFiles) {
        try {
          const relativePath = path.relative(workspacePath, filePath);
          const isIgnored = this.shouldIgnoreFile(relativePath, ignoreRules);
          
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf-8');
          
          const markdownFile: MarkdownFile = {
            path: relativePath,
            name: path.basename(filePath),
            content,
            size: stats.size,
            ignored: isIgnored
          };

          allFiles.push(markdownFile);
        } catch (error) {
          errors.push(`Error processing file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const totalIgnored = allFiles.filter(f => f.ignored).length;
      
      return {
        files: allFiles,
        totalFound: allFiles.length,
        totalIgnored,
        errors
      };
    } catch (error) {
      return {
        files: [],
        totalFound: 0,
        totalIgnored: 0,
        errors: [`Error scanning workspace: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Applies ignore rules to a list of file paths
   */
  applyIgnoreRules(files: string[], ignoreRules: string[]): string[] {
    return files.filter(filePath => !this.shouldIgnoreFile(filePath, ignoreRules));
  }

  /**
   * Checks if a file should be ignored based on ignore rules
   */
  private shouldIgnoreFile(filePath: string, ignoreRules: string[]): boolean {
    // Normalize path separators for cross-platform compatibility
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    return ignoreRules.some(rule => {
      // Handle different rule formats
      if (rule.endsWith('/**')) {
        // Directory pattern - check if file is in this directory
        const dirPattern = rule.slice(0, -3);
        return normalizedPath.startsWith(dirPattern + '/') || normalizedPath === dirPattern;
      } else if (rule.includes('*')) {
        // Glob pattern
        return minimatch(normalizedPath, rule);
      } else {
        // Exact match or simple pattern
        return normalizedPath === rule || normalizedPath.endsWith('/' + rule);
      }
    });
  }

  /**
   * Checks if a file is a markdown file based on extension
   */
  isMarkdownFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.md' || ext === '.markdown';
  }
}