export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CreateDocumentRequest {
  title: string;
  content: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  includeContent?: boolean;
}

export interface SearchResult {
  documents: Document[];
  total: number;
  hasMore: boolean;
}

export interface DocumentFilter {
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  filter?: DocumentFilter;
}