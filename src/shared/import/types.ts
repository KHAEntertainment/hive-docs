// Import-specific types and interfaces

export interface ScanOptions {
  workspacePath: string;
  ignoreRules?: string[];
  includeHidden?: boolean;
}

export interface ScanResult {
  files: import('../types').MarkdownFile[];
  totalFound: number;
  totalIgnored: number;
  errors: string[];
}

export interface FileScanner {
  scanWorkspace(options: ScanOptions): Promise<ScanResult>;
  applyIgnoreRules(files: string[], ignoreRules: string[]): string[];
  isMarkdownFile(filePath: string): boolean;
}