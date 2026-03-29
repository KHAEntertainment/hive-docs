// Shared types between web app and extension

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface MarkdownFile {
  path: string;
  name: string;
  content: string;
  size: number;
  ignored: boolean;
}

export interface ImportOptions {
  removeOriginals: boolean;
  preserveStructure: boolean;
  tagWithPath: boolean;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface HiveDocsConfig {
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