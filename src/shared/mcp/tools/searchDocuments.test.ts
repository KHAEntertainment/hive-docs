import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchDocumentsTool } from './searchDocuments.js';
import { MCPToolContext } from '../types.js';
import { Document, SearchResult } from '../../documents/types.js';

describe('searchDocuments MCP Tool', () => {
  let mockDocumentManager: any;
  let context: MCPToolContext;

  beforeEach(() => {
    mockDocumentManager = {
      searchDocuments: vi.fn()
    };
    context = { documentManager: mockDocumentManager };
  });

  it('should have correct tool definition', () => {
    expect(searchDocumentsTool.definition.name).toBe('searchDocuments');
    expect(searchDocumentsTool.definition.description).toContain('Search documents using full-text search');
    expect(searchDocumentsTool.definition.inputSchema.required).toContain('query');
  });

  it('should successfully search documents with default parameters', async () => {
    const mockDocuments: Document[] = [
      {
        id: 'doc1',
        title: 'Test Document 1',
        content: 'This is test content',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        tags: ['test']
      },
      {
        id: 'doc2',
        title: 'Test Document 2',
        content: 'Another test content',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z')
      }
    ];

    const mockSearchResult: SearchResult = {
      documents: mockDocuments,
      total: 2,
      hasMore: false
    };

    mockDocumentManager.searchDocuments.mockResolvedValue(mockSearchResult);

    const result = await searchDocumentsTool.handler({ query: 'test' }, context);

    expect(result.success).toBe(true);
    expect(result.query).toBe('test');
    expect(result.results.documents).toHaveLength(2);
    expect(result.results.total).toBe(2);
    expect(result.results.hasMore).toBe(false);
    expect(result.results.limit).toBe(20);
    expect(result.results.offset).toBe(0);
    
    expect(mockDocumentManager.searchDocuments).toHaveBeenCalledWith({
      query: 'test',
      limit: 20,
      offset: 0,
      includeContent: false
    });
  });

  it('should search with custom parameters', async () => {
    const mockSearchResult: SearchResult = {
      documents: [],
      total: 0,
      hasMore: false
    };

    mockDocumentManager.searchDocuments.mockResolvedValue(mockSearchResult);

    await searchDocumentsTool.handler({
      query: 'custom search',
      limit: 10,
      offset: 5,
      includeContent: true
    }, context);

    expect(mockDocumentManager.searchDocuments).toHaveBeenCalledWith({
      query: 'custom search',
      limit: 10,
      offset: 5,
      includeContent: true
    });
  });

  it('should throw error when query is missing', async () => {
    await expect(
      searchDocumentsTool.handler({} as any, context)
    ).rejects.toThrow('Search query is required and must be a string');
  });

  it('should throw error when query is empty', async () => {
    await expect(
      searchDocumentsTool.handler({ query: '   ' }, context)
    ).rejects.toThrow('Search query cannot be empty');
  });

  it('should throw error when limit is invalid', async () => {
    await expect(
      searchDocumentsTool.handler({ query: 'test', limit: 0 }, context)
    ).rejects.toThrow('Limit must be a number between 1 and 100');

    await expect(
      searchDocumentsTool.handler({ query: 'test', limit: 101 }, context)
    ).rejects.toThrow('Limit must be a number between 1 and 100');
  });

  it('should throw error when offset is invalid', async () => {
    await expect(
      searchDocumentsTool.handler({ query: 'test', offset: -1 }, context)
    ).rejects.toThrow('Offset must be a non-negative number');
  });

  it('should trim whitespace from query', async () => {
    const mockSearchResult: SearchResult = {
      documents: [],
      total: 0,
      hasMore: false
    };

    mockDocumentManager.searchDocuments.mockResolvedValue(mockSearchResult);

    const result = await searchDocumentsTool.handler({ query: '  test query  ' }, context);

    expect(result.query).toBe('test query');
    expect(mockDocumentManager.searchDocuments).toHaveBeenCalledWith({
      query: 'test query',
      limit: 20,
      offset: 0,
      includeContent: false
    });
  });

  it('should format document results correctly', async () => {
    const mockDocument: Document = {
      id: 'doc1',
      title: 'Test Document',
      content: 'This is test content',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      tags: ['test', 'example'],
      metadata: { author: 'test-user' }
    };

    const mockSearchResult: SearchResult = {
      documents: [mockDocument],
      total: 1,
      hasMore: false
    };

    mockDocumentManager.searchDocuments.mockResolvedValue(mockSearchResult);

    const result = await searchDocumentsTool.handler({ query: 'test' }, context);

    const doc = result.results.documents[0];
    expect(doc.id).toBe('doc1');
    expect(doc.title).toBe('Test Document');
    expect(doc.content).toBe('This is test content');
    expect(doc.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(doc.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    expect(doc.tags).toEqual(['test', 'example']);
    expect(doc.metadata).toEqual({ author: 'test-user' });
  });

  it('should handle documents without optional fields', async () => {
    const mockDocument: Document = {
      id: 'doc1',
      title: 'Simple Document',
      content: 'Simple content',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z')
    };

    const mockSearchResult: SearchResult = {
      documents: [mockDocument],
      total: 1,
      hasMore: false
    };

    mockDocumentManager.searchDocuments.mockResolvedValue(mockSearchResult);

    const result = await searchDocumentsTool.handler({ query: 'test' }, context);

    const doc = result.results.documents[0];
    expect(doc.tags).toEqual([]);
    expect(doc.metadata).toEqual({});
  });

  it('should handle database errors gracefully', async () => {
    mockDocumentManager.searchDocuments.mockRejectedValue(new Error('Search index error'));

    await expect(
      searchDocumentsTool.handler({ query: 'test' }, context)
    ).rejects.toThrow('Failed to search documents: Search index error');
  });
});