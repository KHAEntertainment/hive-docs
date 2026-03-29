import { DatabaseConnection } from '../database/connection';
import { 
  Document, 
  CreateDocumentRequest, 
  UpdateDocumentRequest, 
  SearchOptions, 
  SearchResult,
  ListOptions,
  DocumentFilter
} from './types';
import { randomUUID } from 'crypto';

export class DocumentManager {
  private connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  async createDocument(request: CreateDocumentRequest): Promise<Document> {
    const id = randomUUID();
    const now = new Date();
    const tags = request.tags ? JSON.stringify(request.tags) : null;
    const metadata = request.metadata ? JSON.stringify(request.metadata) : null;

    await this.connection.run(
      `INSERT INTO documents (id, title, content, created_at, updated_at, tags, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, request.title, request.content, now.toISOString(), now.toISOString(), tags, metadata]
    );

    const document = await this.getDocumentById(id);
    if (!document) {
      throw new Error('Failed to create document');
    }

    return document;
  }

  async getDocumentById(id: string): Promise<Document | null> {
    const row = await this.connection.get<any>(
      'SELECT * FROM documents WHERE id = ?',
      [id]
    );

    if (!row) {
      return null;
    }

    return this.mapRowToDocument(row);
  }

  async updateDocument(id: string, request: UpdateDocumentRequest): Promise<Document> {
    const existing = await this.getDocumentById(id);
    if (!existing) {
      throw new Error(`Document with id ${id} not found`);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (request.title !== undefined) {
      updates.push('title = ?');
      params.push(request.title);
    }

    if (request.content !== undefined) {
      updates.push('content = ?');
      params.push(request.content);
    }

    if (request.tags !== undefined) {
      updates.push('tags = ?');
      params.push(request.tags ? JSON.stringify(request.tags) : null);
    }

    if (request.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(request.metadata ? JSON.stringify(request.metadata) : null);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await this.connection.run(
      `UPDATE documents SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getDocumentById(id);
    if (!updated) {
      throw new Error('Failed to update document');
    }

    return updated;
  }

  async deleteDocument(id: string): Promise<void> {
    const existing = await this.getDocumentById(id);
    if (!existing) {
      throw new Error(`Document with id ${id} not found`);
    }

    await this.connection.run('DELETE FROM documents WHERE id = ?', [id]);
  }

  async listDocuments(options: ListOptions = {}): Promise<Document[]> {
    const {
      limit = 50,
      offset = 0,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = options;

    let query = 'SELECT * FROM documents';
    const params: any[] = [];

    // Add WHERE clause for filters
    if (options.filter) {
      const conditions = this.buildFilterConditions(options.filter, params);
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }

    // Add ORDER BY clause
    const orderColumn = this.mapSortColumn(sortBy);
    query += ` ORDER BY ${orderColumn} ${sortOrder.toUpperCase()}`;

    // Add LIMIT and OFFSET
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await this.connection.all<any>(query, params);
    return rows.map(row => this.mapRowToDocument(row));
  }

  async searchDocuments(options: SearchOptions): Promise<SearchResult> {
    const {
      query,
      limit = 50,
      offset = 0,
      includeContent = true
    } = options;

    // Use FTS5 for full-text search
    const searchQuery = `
      SELECT d.*, 
             bm25(documents_fts) as rank
      FROM documents_fts 
      JOIN documents d ON documents_fts.rowid = d.rowid
      WHERE documents_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `;

    const rows = await this.connection.all<any>(searchQuery, [query, limit + 1, offset]);
    
    const hasMore = rows.length > limit;
    const documents = rows.slice(0, limit).map(row => {
      const doc = this.mapRowToDocument(row);
      if (!includeContent) {
        // Return a preview of content (first 200 characters)
        doc.content = doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : '');
      }
      return doc;
    });

    // Get total count for the search
    const countQuery = `
      SELECT COUNT(*) as total
      FROM documents_fts 
      WHERE documents_fts MATCH ?
    `;
    const countResult = await this.connection.get<{ total: number }>(countQuery, [query]);
    const total = countResult?.total || 0;

    return {
      documents,
      total,
      hasMore
    };
  }

  async getDocumentsByTag(tag: string): Promise<Document[]> {
    const rows = await this.connection.all<any>(
      `SELECT * FROM documents 
       WHERE tags IS NOT NULL 
       AND json_extract(tags, '$') LIKE ?
       ORDER BY updated_at DESC`,
      [`%"${tag}"%`]
    );

    return rows.map(row => this.mapRowToDocument(row));
  }

  async getAllTags(): Promise<string[]> {
    const rows = await this.connection.all<{ tags: string }>(
      'SELECT DISTINCT tags FROM documents WHERE tags IS NOT NULL'
    );

    const allTags = new Set<string>();
    
    for (const row of rows) {
      try {
        const tags = JSON.parse(row.tags) as string[];
        tags.forEach(tag => allTags.add(tag));
      } catch (error) {
        console.warn('Failed to parse tags:', row.tags);
      }
    }

    return Array.from(allTags).sort();
  }

  async getDocumentCount(): Promise<number> {
    const result = await this.connection.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM documents'
    );
    return result?.count || 0;
  }

  async getRecentDocuments(limit: number = 10): Promise<Document[]> {
    const rows = await this.connection.all<any>(
      'SELECT * FROM documents ORDER BY updated_at DESC LIMIT ?',
      [limit]
    );

    return rows.map(row => this.mapRowToDocument(row));
  }

  private mapRowToDocument(row: any): Document {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }

  private buildFilterConditions(filter: DocumentFilter, params: any[]): string[] {
    const conditions: string[] = [];

    if (filter.tags && filter.tags.length > 0) {
      const tagConditions = filter.tags.map(() => 'json_extract(tags, \'$\') LIKE ?');
      conditions.push(`(${tagConditions.join(' OR ')})`);
      filter.tags.forEach(tag => params.push(`%"${tag}"%`));
    }

    if (filter.createdAfter) {
      conditions.push('created_at >= ?');
      params.push(filter.createdAfter.toISOString());
    }

    if (filter.createdBefore) {
      conditions.push('created_at <= ?');
      params.push(filter.createdBefore.toISOString());
    }

    if (filter.updatedAfter) {
      conditions.push('updated_at >= ?');
      params.push(filter.updatedAfter.toISOString());
    }

    if (filter.updatedBefore) {
      conditions.push('updated_at <= ?');
      params.push(filter.updatedBefore.toISOString());
    }

    return conditions;
  }

  private mapSortColumn(sortBy: string): string {
    switch (sortBy) {
      case 'title':
        return 'title';
      case 'createdAt':
        return 'created_at';
      case 'updatedAt':
        return 'updated_at';
      default:
        return 'updated_at';
    }
  }
}